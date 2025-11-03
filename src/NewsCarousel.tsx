import React, { useEffect, useState, useMemo } from 'react'; // Importazioni esplicite di React Hooks
// Importa gli stili globali (assumiamo che il file App.css sia in grado di stilizzare anche questo componente)
import "./NewsCarousel.css"; // Rimuovo questo import se lo stile è in App.css

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

/**
 * Funzione di rendering della card per il carosello.
 */
const renderCard = (item: RSSItem, index: number) => {
    // Ora la presenza dell'immagine non è garantita
    const hasImage = !!item.enclosureUrl;
    
    // La card senza immagine avrà uno stile di sfondo leggermente diverso e più testo visibile
    return (
        <a 
            key={index} 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer"
            // Se non c'è immagine, uso una classe specifica
            className={`card card-carousel-item ${hasImage ? 'with-img' : 'without-img'}`}
            onClick={(e) => e.stopPropagation()} 
        >
            {/* Immagine: mostrata solo se presente. Usa un'altezza fissa. */}
            {hasImage ? (
                <img 
                    src={item.enclosureUrl} 
                    alt={item.title} 
                    // Fallback con placeholder generico
                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/400x200/cccccc/333333?text=Nessuna+Immagine')} 
                />
            ) : (
                // Placeholder testuale per quando manca l'immagine
                <div className="carousel-text-placeholder">
                </div>
            )}

            <div className="content">
                {/* Il titolo usa sempre la classe del carosello */}
                <h3 className="card-title-carousel">{item.title}</h3>
                
                {/* Se non c'è immagine, mostro una breve descrizione per riempire lo spazio */}
                {!hasImage && item.description && (
                    <p className="carousel-desc-only-text" dangerouslySetInnerHTML={{ __html: item.description.substring(0, 100) + '...' }}></p>
                )}

                <div className="card-footer">
                    <span className="source-tag">{item.source}</span>
                </div>
            </div>
        </a>
    );
};


const NewsCarousel: React.FC<NewsCarouselProps> = ({ newsItems, startIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // LOGICA CHIAVE MODIFICATA: L'array da visualizzare è ora l'array completo newsItems
  // (che contiene già le notizie che non sono state usate nel layout principale).
  // NON filtriamo più per la presenza dell'immagine qui.
  const newsToDisplay = useMemo(() => {
      // Potresti voler limitare il numero totale di notizie nel carosello per performance, ad esempio a 20.
      return newsItems.slice(0, 20); 
  }, [newsItems]); 

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
    return <div className="status-message">Nessuna notizia extra disponibile per il carosello.</div>;
  }
  
  // Stile per far scorrere il track
  const transformStyle = {
    // La trasformazione è basata su -currentIndex * 100%, dove 100% è la larghezza di un singolo elemento del carosello
    transform: `translateX(-${currentIndex * 100}%)`,
    transition: 'transform 0.5s ease-in-out',
  };

  return (
    <div className="news-carousel-container">
        <h2 className="section-title-extra">Ultime Notizie (Scorri)</h2>
        
        <div className="news-carousel-track" style={transformStyle}>
            {/* Mappa sull'array completo (con e senza immagine) */}
            {newsToDisplay.map((item: RSSItem, index: number) => (
                <div key={startIndex + index} className="carousel-item">
                    {renderCard(item, startIndex + index)}
                </div>
            ))}
        </div>
        
        {/* Punti di navigazione */}
        <div className="carousel-dots">
            {/* Mappa sull'array completo per i punti */}
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
