import React, { useEffect, useState } from "react"; 
import "./App.css"; 
import WeatherCarousel from './WeatherCarousel'; 
import NewsCarousel from './NewsCarousel'; 

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

// Array di fonti RSS (AGGIUNTE NUOVE FONTI ITALIANE E SPORT)
const RSS_SOURCES = [
  { name: "ANSA Italia", url: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml" },
  { name: "LA STAMPA Mondo", url: "https://www.lastampa.it/rss/esteri.xml" },
  { name: "IL SOLE 24 ORE Economia", url: "https://www.ilsole24ore.com/rss/italia.xml" },
  { name: "CORRIERE della SERA", url: "https://www.corriere.it/rss/homepage.xml" }, // Nuova Fonte
  { name: "REPUBBLICA News", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml" }, // Nuova Fonte
  { name: "GAZZETTA dello SPORT", url: "https://www.gazzetta.it/rss/homepage.xml" }, // Nuova Fonte (Sport)
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
];

// Definizioni delle quantità di notizie per ciascuna sezione
const NEWS_BOTTOM_LEFT_COUNT = 4;   
const NEWS_TOP_RIGHT_COUNT = 1;      
const NEWS_MIDDLE_RIGHT_COUNT = 4;    
const NEWS_CAROUSEL_COUNT = 5; 

const TOTAL_NEWS_COUNT = NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT + NEWS_CAROUSEL_COUNT;


const App: React.FC = () => {
  const [news, setNews] = useState<RSSItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  // Funzione per estrarre il testo da un elemento XML
  const getTextContent = (element: Element | null, tagName: string): string | undefined => {
      const node = element?.querySelector(tagName);
      return node?.textContent || undefined;
  }
  
  // Funzione per estrarre l'attributo src/url da un elemento media/enclosure
  const getMediaUrl = (element: Element | null): string | undefined => {
      const mediaContent = element?.querySelector('enclosure') || 
                           element?.querySelector('media\\:content') || 
                           element?.querySelector('media\\:thumbnail');
      return mediaContent?.getAttribute('url') || mediaContent?.getAttribute('href') || undefined;
  }
  
  // Funzione di rendering per le card (NON carosello)
  const renderCard = (item: RSSItem, index: number, layoutType: 'vertical' | 'horizontal-small' | 'horizontal-large') => {
    const hasImage = !!item.enclosureUrl;
    let finalLayoutClass = layoutType;

    if (!hasImage && layoutType !== 'horizontal-small') {
        finalLayoutClass = 'horizontal-small';
    }
    
    return (
      <a 
        key={index} 
        href={item.link} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`card ${finalLayoutClass} ${hasImage ? 'with-img' : 'without-img'}`}
      >
        {hasImage && <img src={item.enclosureUrl} alt={item.title} onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <div className="content">
          <h3>{item.title}</h3>
          <div className="card-footer">
            <span className="source-tag">{item.source}</span>
          </div>
        </div>
      </a>
    );
  };
  
  // Logica per il fetching dei feed RSS
  const fetchRSS = async (source: { name: string; url: string }): Promise<RSSItem[]> => {
    try {
      const res = await fetch(CORS_PROXY + encodeURIComponent(source.url));
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      const items = Array.from(xmlDoc.querySelectorAll('item') || xmlDoc.querySelectorAll('entry'));

      return items.map((item) => {
          const title = getTextContent(item, 'title');
          const linkNode = item.querySelector('link');
          const link = linkNode?.getAttribute('href') || linkNode?.textContent; 
          
          return {
            title: title || 'Notizia senza titolo',
            link: link || '#',
            description: getTextContent(item, 'description') || getTextContent(item, 'summary') || '',
            enclosureUrl: getMediaUrl(item),
            source: source.name,
            pubDate: new Date(getTextContent(item, 'pubDate') || getTextContent(item, 'updated') || Date.now()),
          }
      }).filter(item => item.title && item.link);

    } catch (error) {
      console.error("Errore nel fetch dell'RSS da", source.name, error);
      return [];
    }
  };

  const loadNews = async () => {
    setLoadingNews(true);
    try {
      const newsPromises = RSS_SOURCES.map(source => fetchRSS(source));
      const results = await Promise.all(newsPromises);
      
      let allNews: RSSItem[] = results.flat();

      // Implementazione della deduplicazione (rimuove notizie con titolo e link uguali)
      const uniqueNewsMap = new Map<string, RSSItem>();
      allNews.forEach(item => {
        // Usa una combinazione di titolo e link come chiave di unicità
        const key = item.title + item.link;
        if (!uniqueNewsMap.has(key)) {
          uniqueNewsMap.set(key, item);
        }
      });

      const uniqueAndSortedNews = Array.from(uniqueNewsMap.values())
        .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()); 

      setNews(uniqueAndSortedNews.slice(0, TOTAL_NEWS_COUNT)); 
    } catch (err) {
      console.error("Errore aggregazione RSS:", err);
    } finally {
      setLoadingNews(false);
    }
  };

  // Logica per il caricamento iniziale e l'aggiornamento automatico (2 minuti)
  useEffect(() => {
    loadNews(); // Caricamento iniziale

    const intervalId = setInterval(() => {
      console.log("Aggiornamento notizie automatico in corso...");
      loadNews(); // Ricarica ogni 2 minuti
    }, 120000); // 120000 ms = 2 minuti

    // Pulizia dell'interval al smontaggio del componente
    return () => clearInterval(intervalId);
  }, []);

  // Suddivisione delle notizie per il layout
  const newsBottomLeft = news.slice(0, NEWS_BOTTOM_LEFT_COUNT);
  const newsTopRight = news.slice(NEWS_BOTTOM_LEFT_COUNT, NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT);
  const newsMiddleRight = news.slice(
    NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT,
    NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT
  );
  const newsForCarousel = news.slice(
    NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT,
    TOTAL_NEWS_COUNT
  );

  const startIndexForCarousel = NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT;


  return (
    <div className="page">
      <header className="header">
        <h1>📰 Dashboard Notizie & Aggiornamenti Live</h1>
      </header>
      
      {loadingNews && news.length === 0 && (
        <div className="loading-overlay">Caricamento Notizie...</div>
      )}
      
      {news.length > 0 && (
        <div className="main-layout-complex">
          
          {/* Colonna Sinistra (Video + Notizie Verticali) */}
          <div className="left-column">
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
            
            {/* Notizie sotto il video (Verticali) */}
            <div className="news-grid-bottom-left">
              {newsBottomLeft.map((item: RSSItem, index: number) => renderCard(item, index, 'vertical'))}
            </div>
          </div>

          {/* Colonna Centrale (Resto delle Notizie) */}
          <div className="center-column-news">

  {/* Carosello Notizie Dal Mondo */}
            <div className="news-bottom-right-carousel">
              <NewsCarousel 
                  newsItems={newsForCarousel} 
                  startIndex={startIndexForCarousel}
              />
            </div>

            {/* Card Orizzontale Grande (Top Right) */}
            <div className="news-top-right">
              {newsTopRight.map((item: RSSItem, index: number) => renderCard(item, index + NEWS_BOTTOM_LEFT_COUNT, 'horizontal-large'))}
            </div>

            {/* Due Righe di Card Orizzontali Piccole (Middle Right) */}
            <div className="news-middle-right">
              {newsMiddleRight.map((item: RSSItem, index: number) => renderCard(item, index + NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT, 'horizontal-small'))}
            </div>
            
            
          </div>
          
          {/* Colonna Destra (Meteo) */}
          <div className="right-column-weather">
              <WeatherCarousel />
          </div>
        </div>
      )}
      {loadingNews && news.length > 0 && (
        <div className="loading-overlay-small">Aggiornamento Notizie...</div>
      )}
    </div>
  );
};

export default App;