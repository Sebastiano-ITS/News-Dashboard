import React, { useEffect, useState } from "react";
import { XMLParser } from "fast-xml-parser";
import "./App.css";

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  enclosureUrl?: string;
}

const CORS_PROXY = "https://api.allorigins.win/raw?url=";
const RSS_URL_ITALY = "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml";
const RSS_URL_WORLD = "http://feeds.bbci.co.uk/news/world/rss.xml";

// Definizioni delle quantità di notizie per ciascuna sezione
const NEWS_BOTTOM_LEFT_COUNT = 3;   // Nuova sezione sotto il video (3 card)
const NEWS_TOP_RIGHT_COUNT = 1;      // Card grande orizzontale
const NEWS_MIDDLE_RIGHT_COUNT = 4;    // Due righe di card orizzontali (4 card)
const NEWS_BOTTOM_RIGHT_COUNT = 2;    // Card extra sotto le Middle Right (2 card)
// Totale: 3 + 1 + 4 + 2 = 10 notizie totali

const App: React.FC = () => {
  const [news, setNews] = useState<RSSItem[]>([]);

  useEffect(() => {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

    const fetchRSS = async (url: string) => {
      const res = await fetch(CORS_PROXY + encodeURIComponent(url));
      const xmlText = await res.text();
      const json = parser.parse(xmlText);

      let items: any[] = [];
      if (json.rss?.channel?.item) {
        items = Array.isArray(json.rss.channel.item)
          ? json.rss.channel.item
          : [json.rss.channel.item];
      }

      return items.filter(item => item.title && item.link).map((item) => ({
        title: item.title,
        link: item.link,
        description: item.description || item.contentSnippet,
        enclosureUrl: item.enclosure?.url || item["media:content"]?.url,
      })) as RSSItem[];
    };

    const loadNews = async () => {
      try {
        const italyNews = await fetchRSS(RSS_URL_ITALY);
        const worldNews = await fetchRSS(RSS_URL_WORLD);
        
        // Prendiamo esattamente 10 notizie, mescolando le fonti per diversità
        const allNewsPool = [];
        // Alterniamo tra le due fonti
        for (let i = 0; i < 5; i++) {
            if (italyNews[i]) allNewsPool.push(italyNews[i]);
            if (worldNews[i]) allNewsPool.push(worldNews[i]);
        }
        
        const requiredCount = NEWS_BOTTOM_LEFT_COUNT + NEWS_TOP_RIGHT_COUNT + NEWS_MIDDLE_RIGHT_COUNT + NEWS_BOTTOM_RIGHT_COUNT;
        const finalNews = allNewsPool.slice(0, requiredCount); 
        setNews(finalNews);
      } catch (err) {
        console.error("Errore fetch RSS:", err);
      }
    };

    loadNews();
  }, []);

  // Suddivisione delle notizie (10 in totale)
  let currentIndex = 0;
  
  const newsBottomLeft = news.slice(currentIndex, currentIndex + NEWS_BOTTOM_LEFT_COUNT);
  currentIndex += NEWS_BOTTOM_LEFT_COUNT;
  
  const newsTopRight = news.slice(currentIndex, currentIndex + NEWS_TOP_RIGHT_COUNT);
  currentIndex += NEWS_TOP_RIGHT_COUNT;
  
  const newsMiddleRight = news.slice(currentIndex, currentIndex + NEWS_MIDDLE_RIGHT_COUNT);
  currentIndex += NEWS_MIDDLE_RIGHT_COUNT;
  
  const newsBottomRight = news.slice(currentIndex, currentIndex + NEWS_BOTTOM_RIGHT_COUNT);

  const renderCard = (item: RSSItem, index: number, extraClass: string = '') => (
    <div
      key={index}
      className={`card ${extraClass} ${item.enclosureUrl ? "with-img" : "without-img"}`}
    >
      {item.enclosureUrl && <img src={item.enclosureUrl} alt={item.title} />}
      <div className="content">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <a href={item.link} target="_blank" rel="noopener noreferrer">
          Leggi di più →
        </a>
      </div>
    </div>
  );

  return (
    <div className="page">
      <header className="header">
        <h1>📰 Notizie Live</h1>
      </header>

      <div className="main-layout-complex">
        {/* Colonna Sinistra: Video + Notizie sotto */}
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
          
          {/* NUOVA SEZIONE: Notizie in basso a sinistra (verticali) */}
          <div className="news-grid-bottom-left">
            {newsBottomLeft.map((item, index) => renderCard(item, index, 'card-vertical'))}
          </div>
        </div>

        {/* Colonna Destra */}
        <div className="right-column">
          {/* Destra Orizzontale Grande (Top Right) */}
          <div className="news-top-right">
            {newsTopRight.map((item, index) => renderCard(item, index, 'card-horizontal-large'))}
          </div>

          {/* Destra Orizzontale Piccola (Middle Right) - 2 Righe */}
          <div className="news-middle-right">
            {newsMiddleRight.map((item, index) => renderCard(item, index, 'card-horizontal-small'))}
          </div>
          
          {/* Destra in Basso (Bottom Right) - 2 card */}
          <div className="news-bottom-right">
            {newsBottomRight.map((item, index) => renderCard(item, index, 'card-horizontal-extra'))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;