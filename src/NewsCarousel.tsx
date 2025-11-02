import React, { useEffect, useState, useMemo } from 'react'; // Importazioni esplicite di React Hooks


// Interfaccia news passata come props
interface RSSItem {
  title: string;
  link: string;
  description?: string;
  enclosureUrl?: string; // Campo immagine
  source: string;
  pubDate: Date;
}

interface NewsCarouselProps {
  newsItems: RSSItem[];
  startIndex: number;
}

// L'intervallo di rotazione è impostato a 5 secondi (5000ms)
const ROTATION_INTERVAL_MS = 5000; 

// Funzione di rendering della card (stili compatti e titoli grandi)
const renderCard = (item: RSSItem, index: number) => {
    // Dato che il filtro avviene nel componente principale, qui ha sempre un'immagine
    const hasImage = !!item.enclosureUrl;
    
    return (
        <a 
            key={index} 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer"
            // Usa la classe 'compact-carousel-card' per gli stili modificati in CSS
            className={`card vertical compact-carousel-card ${hasImage ? 'with-img' : 'without-img'}`}
            onClick={(e) => e.stopPropagation()} 
        >
            {/* L'immagine è ora obbligatoria per apparire nel carosello */}
            {hasImage && <img 
                src={item.enclosureUrl} 
                alt={item.title} 
                onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x200/cccccc/333333?text=Nessuna+Immagine')} 
            />}
            <div className="content">
                <h3 className="card-title-carousel">{item.title}</h3>
                <div className="card-footer">
                    <span className="source-tag">{item.source}</span>
                </div>
            </div>
        </a>
    );
};


const NewsCarousel: React.FC<NewsCarouselProps> = ({ newsItems, startIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // LOGICA CHIAVE: Filtra l'array per includere SOLO le notizie con immagine (enclosureUrl)
  const newsToDisplay = useMemo(() => {
      return newsItems.filter(item => !!item.enclosureUrl);
  }, [newsItems]); // Rifiltra solo se newsItems cambia


  // Effetto per la rotazione automatica
  useEffect(() => {
    if (newsToDisplay.length === 0) return; // Non avviare se non ci sono notizie

    const intervalId = setInterval(() => {
      // Passa all'elemento successivo, tornando a 0 se raggiunge la fine
      setCurrentIndex(prevIndex => (prevIndex + 1) % newsToDisplay.length);
    }, ROTATION_INTERVAL_MS); // Intervallo di 5 secondi

    return () => clearInterval(intervalId);
  }, [newsToDisplay.length]); // Dipende dalla lunghezza dell'array filtrato

  if (newsToDisplay.length === 0) {
    // Messaggio più specifico quando non ci sono notizie filtrate
    return <div className="status-message">Nessuna notizia con immagine disponibile per il carosello.</div>;
  }
  
  // Stile per far scorrere il track
  const transformStyle = {
    transform: `translateX(-${currentIndex * 100}%)`,
    transition: 'transform 0.5s ease-in-out',
  };

  return (
    <div className="news-carousel-container">
        <h2 className="section-title-extra">Ultime Notizie con Immagine</h2>
        
        <div className="news-carousel-track" style={transformStyle}>
            {/* Mappa sull'array filtrato */}
            {newsToDisplay.map((item: RSSItem, index: number) => (
                <div key={startIndex + index} className="carousel-item">
                    {renderCard(item, startIndex + index)}
                </div>
            ))}
        </div>
        
        {/* Punti di navigazione */}
        <div className="carousel-dots">
            {/* Mappa sull'array filtrato per i punti */}
            {newsToDisplay.map((_, index: number) => (
                <span 
                    key={index}
                    className={`dot ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)} 
                    aria-label={`Vai alla notizia ${index + 1}`}
                />
            ))}
        </div>
    </div>
  );
};

export default NewsCarousel;