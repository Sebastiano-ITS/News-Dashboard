import React, { useEffect, useState, useMemo } from "react";
import './App.css';

/**
 * Interfaccia per un elemento RSS.
 */
interface RSSItem {
  title: string;
  link: string;
  description?: string;
  enclosureUrl?: string;
  source: string; // Fonte: ANSA, La Stampa, BBC WORLD, ecc.
  pubDate: Date; // Aggiunto per l'ordinamento
}

// URL per il proxy CORS
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

// Array di fonti RSS
const RSS_SOURCES = [
  { name: "ANSA Italia", url: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml" },
  { name: "LA STAMPA Mondo", url: "https://www.lastampa.it/rss/esteri.xml" },
  { name: "IL SOLE 24 ORE Economia", url: "https://www.ilsole24ore.com/rss/finanza.xml" },
  { name: "CORRIERE SPORT", url: "https://www.corrieredellosport.it/rss/calcio/serie-a" },
  { name: "REPUBBLICA Cronaca", url: "https://www.repubblica.it/rss/cronaca/rss2.0.xml" },
  { name: "BBC WORLD", url: "http://feeds.bbci.co.uk/news/world/rss.xml" }, 
  { name: "CNN Tech", url: "http://rss.cnn.com/rss/cnn_tech.rss" }, 
  { name: "REUTERS", url: "https://feeds.reuters.com/reuters/businessNews" }, 
];

// DEFINIZIONI DEL LAYOUT DESIDERATO (Totale = 18 notizie)
const NEWS_BOTTOM_LEFT_COUNT = 6;   // 2x2 card sotto il video
const NEWS_TOP_RIGHT_COUNT = 1;      // Card grande orizzontale
const NEWS_MIDDLE_RIGHT_COUNT = 6;    // 2x2 card sotto la card principale
const NEWS_BOTTOM_RIGHT_EXTRA = 9;   // Card extra per riempire il fondo
const NEWS_TOTAL_DISPLAYED = NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT + NEWS_BOTTOM_RIGHT_EXTRA; // 18

// Costante per la rotazione (2 minuti = 120000 ms)
const ROTATION_INTERVAL_MS = 120000; 
// Pre-carica un pool di notizie
const NEWS_PRELOAD_COUNT = NEWS_TOTAL_DISPLAYED * 5; 

/**
 * Funzione per estrarre il testo da un elemento XML.
 */
const getTextContent = (element: Element | null | undefined, tag: string): string | undefined => {
    return element?.getElementsByTagName(tag)?.[0]?.textContent ?? undefined;
};

/**
 * Funzione per estrarre l'attributo url da un elemento media:content o enclosure.
 */
const getMediaUrl = (element: Element | null | undefined): string | undefined => {
    const enclosure = element?.getElementsByTagName('enclosure')?.[0]?.getAttribute('url');
    if (enclosure) return enclosure;

    const mediaContent = element?.getElementsByTagName('media:content')?.[0] || element?.getElementsByTagName('content')?.[0];
    const url = mediaContent?.getAttribute('url') || mediaContent?.getAttribute('src');
    if (url) return url;
    
    const linkElements = Array.from(element?.getElementsByTagName('link') ?? []);
    const linkElement = linkElements.find(
        (e: Element) => e.getAttribute('rel') === 'enclosure' || (e.getAttribute('type')?.startsWith('image') && e.getAttribute('href'))
    );
    return linkElement?.getAttribute('href') ?? undefined;
};


const App: React.FC = () => {
  const [allNews, setAllNews] = useState<RSSItem[]>([]); 
  const [startIndex, setStartIndex] = useState(0); 
  const [isFading, setIsFading] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. Logica di caricamento dei dati RSS ---
  useEffect(() => {

    const fetchRSS = async (url: string, sourceName: string): Promise<RSSItem[]> => {
      try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(url));
        const xmlText = await res.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        let items: Element[] = [];
        
        const rssItems = xmlDoc.getElementsByTagName('item');
        if (rssItems.length > 0) {
            items = Array.from(rssItems);
        } else {
            const atomItems = xmlDoc.getElementsByTagName('entry');
            items = Array.from(atomItems);
        }

        return items
            .map((item) => {
                const title = getTextContent(item, 'title');
                const linkElement = item.getElementsByTagName('link')[0];
                const link = linkElement?.getAttribute('href') || getTextContent(item, 'link') || getTextContent(item, 'guid') || getTextContent(item, 'id');
                const description = getTextContent(item, 'description') || getTextContent(item, 'summary');
                const enclosureUrl = getMediaUrl(item);
                const dateString = getTextContent(item, 'pubDate') || getTextContent(item, 'updated');
                
                if (!title || !link || !dateString) return null;
                
                const pubDate = new Date(dateString) || new Date();

                return {
                    title: title,
                    link: link,
                    description: description,
                    enclosureUrl: enclosureUrl,
                    source: sourceName,
                    pubDate: pubDate,
                } as RSSItem;
            })
            .filter((item): item is RSSItem => item !== null)
            .slice(0, NEWS_PRELOAD_COUNT * 2); 
      } catch (err) {
        console.error(`Errore fetch RSS per ${sourceName}:`, err);
        return [];
      }
    };

    const loadNews = async () => {
      setIsLoading(true);
      const promises = RSS_SOURCES.map(source => 
        fetchRSS(source.url, source.name)
      );
      const results = await Promise.all(promises);
      let allFetchedNews = results.flat().filter(item => item.title);

      allFetchedNews.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

      // Bilanciamento (sempre preferito)
      const newsWithImage = allFetchedNews.filter(item => item.enclosureUrl);
      const newsWithoutImage = allFetchedNews.filter(item => !item.enclosureUrl);

      let balancedPool: RSSItem[] = [];
      let i = 0, j = 0;

      while (balancedPool.length < NEWS_PRELOAD_COUNT && (i < newsWithImage.length || j < newsWithoutImage.length)) {
          if (i < newsWithImage.length) {
              balancedPool.push(newsWithImage[i]);
              i++;
          }
          if (balancedPool.length < NEWS_PRELOAD_COUNT && j < newsWithoutImage.length) {
              balancedPool.push(newsWithoutImage[j]);
              j++;
          }
      }
      
      const finalPool = balancedPool.length > NEWS_TOTAL_DISPLAYED ? balancedPool : allFetchedNews.slice(0, NEWS_PRELOAD_COUNT);

      setAllNews(finalPool);
      setIsLoading(false);
    };

    loadNews();
  }, []); 

  // --- 2. Logica di Rotazione (Timer) ---
  useEffect(() => {
    if (allNews.length < NEWS_TOTAL_DISPLAYED * 2 || isLoading) return;

    const rotateNews = () => {
        setIsFading(true);
        
        const transitionDuration = 500; 

        const dataChangeTimeout = setTimeout(() => {
            setStartIndex(prevIndex => {
                const newIndex = prevIndex + NEWS_TOTAL_DISPLAYED;
                return (newIndex >= allNews.length) ? 0 : newIndex;
            });
            setIsFading(false);
        }, transitionDuration); 

        return () => clearTimeout(dataChangeTimeout);
    };

    const intervalId = setInterval(rotateNews, ROTATION_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [allNews.length, isLoading]); 

  // --- 3. Suddivisione delle notizie visualizzate (Memoized) ---
  const currentNews = useMemo(() => {
    let newsSlice = allNews.slice(startIndex, startIndex + NEWS_TOTAL_DISPLAYED);

    if (newsSlice.length < NEWS_TOTAL_DISPLAYED && allNews.length >= NEWS_TOTAL_DISPLAYED) {
        const remaining = NEWS_TOTAL_DISPLAYED - newsSlice.length;
        newsSlice = newsSlice.concat(allNews.slice(0, remaining));
    }
    while (newsSlice.length < NEWS_TOTAL_DISPLAYED) {
      newsSlice.push({ title: "Notizia in aggiornamento...", link: "#", source: "System", pubDate: new Date() });
    }
    
    return newsSlice;
  }, [allNews, startIndex]);

  // Suddivisione dello slice corrente
  let currentSliceIndex = 0;
  
  const newsBottomLeft = currentNews.slice(currentSliceIndex, currentSliceIndex + NEWS_BOTTOM_LEFT_COUNT);
  currentSliceIndex += NEWS_BOTTOM_LEFT_COUNT;
  
  const newsTopRight = currentNews.slice(currentSliceIndex, currentSliceIndex + NEWS_TOP_RIGHT_COUNT);
  currentSliceIndex += NEWS_TOP_RIGHT_COUNT;
  
  const newsMiddleRight = currentNews.slice(currentSliceIndex, currentSliceIndex + NEWS_MIDDLE_RIGHT_COUNT);
  currentSliceIndex += NEWS_MIDDLE_RIGHT_COUNT;

  const newsBottomRightExtra = currentNews.slice(currentSliceIndex, currentSliceIndex + NEWS_BOTTOM_RIGHT_EXTRA);
  currentSliceIndex += NEWS_BOTTOM_RIGHT_EXTRA;


  const renderCard = (item: RSSItem, index: number, layoutType: 'vertical' | 'horizontal-large' | 'horizontal-small' = 'vertical') => {
    
    // Assegna la classe CSS appropriata
    let extraClass = '';
    if (layoutType === 'horizontal-large') extraClass = 'card-horizontal-large';
    else if (layoutType === 'horizontal-small') extraClass = 'card-horizontal-small';
    else if (layoutType === 'vertical') extraClass = 'card-vertical';

    return (
      <div
        key={item.link + index} 
        className={`card ${extraClass} ${item.enclosureUrl ? 'has-image' : 'no-image'}`}
        onClick={() => window.open(item.link, '_blank')}
      >
        {item.enclosureUrl && (
            <img 
                src={item.enclosureUrl} 
                alt={item.title} 
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.src = `https://placehold.co/100x100/333333/dddddd?text=NO+IMG`; 
                }}
            />
        )}
        <div className="content">
          <span className="news-source">{item.source}</span>
          <h3>{item.title}</h3>
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
        <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ color: '#555' }}>Caricamento notizie in corso...</h2>
        </div>
    );
  }

  return (
    <>

      {/* Struttura JSX */}
      <div className="page">
        <header className="header">
          <h1>📰 Notizie in Tempo Reale</h1>
        </header>

        {/* Classe news-container e stile dinamico per l'animazione */}
        <div className={`main-layout-complex news-container ${isFading ? 'is-fading' : ''}`}>
          
          {/* Colonna Sinistra */}
          <div className="left-column">
            
            {/* 1. Video (Alto a Sinistra) - Sticky per un'esperienza migliore */}
            <div className="video-side">
              <iframe
                src="https://www.youtube.com/embed/pUcmpyynASM?autoplay=1&mute=1"
                title="YouTube live"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
            
            {/* 2. Notizie in basso a sinistra (4 card verticali in 2x2 grid) */}
            <div className="news-grid-bottom-left">
              {newsBottomLeft.map((item, index) => renderCard(item, index, 'vertical'))}
            </div>
          </div>

          {/* Colonna Destra */}
          <div className="right-column">
            
            {/* 3. Destra Orizzontale Grande (1 card) */}
            <div className="news-top-right">
              {newsTopRight.map((item, index) => renderCard(item, index + NEWS_BOTTOM_LEFT_COUNT, 'horizontal-large'))}
            </div>

            {/* 4. Destra Orizzontale Piccola (4 card orizzontali in 2x2 grid) */}
            <div className="news-middle-right">
              {newsMiddleRight.map((item, index) => renderCard(item, index + NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT, 'horizontal-small'))}
            </div>
            
            {/* 5. Destra in Basso (Card extra per riempire lo spazio) */}
            <h2 style={{ fontSize: '20px', color: '#555', marginTop: '10px' }}>Altre Notizie Dal Mondo</h2>
            <div className="news-bottom-right-extra">
              {newsBottomRightExtra.map((item, index) => renderCard(item, index + NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT, 'vertical'))}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default App;
