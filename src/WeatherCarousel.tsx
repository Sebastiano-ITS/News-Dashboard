import React, { useEffect, useState } from 'react';
import "./WeatherCarousel.css"; 

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  condition: string;
  wind: number;
  humidity: number;
}

const cities = [
  { name: 'Roma', country: 'Italia', lat: 41.9028, lon: 12.4964 },
  { name: 'Milano', country: 'Italia', lat: 45.4642, lon: 9.19 },
  { name: 'Napoli', country: 'Italia', lat: 40.8518, lon: 14.2681 },
  { name: 'Torino', country: 'Italia', lat: 45.0703, lon: 7.6869 },
];

const WeatherCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = async (lat: number, lon: number, city: string, country: string) => {
    try {
      setLoading(true);
      setError(false);

      // ✅ API Open-Meteo (gratuita, senza chiave)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      if (!res.ok) throw new Error('Errore di rete');
      const data = await res.json();
      const current = data.current_weather;

      setWeather({
        city,
        country,
        temp: current.temperature,
        condition: weatherCodeToText(current.weathercode),
        wind: current.windspeed,
        humidity: 50, // valore stimato
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const weatherCodeToText = (code: number): string => {
    const map: Record<number, string> = {
      0: 'Sereno',
      1: 'Poco nuvoloso',
      2: 'Nuvoloso',
      3: 'Coperto',
      45: 'Nebbia',
      51: 'Pioviggine',
      61: 'Pioggia',
      71: 'Neve',
      95: 'Temporale',
    };
    return map[code] || 'N/D';
  };

  useEffect(() => {
    const { lat, lon, name, country } = cities[index];
    fetchWeather(lat, lon, name, country);

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % cities.length);
    }, 2 * 60 * 1000); // 2 minuti

    return () => clearInterval(timer);
  }, [index]);

  return (
    <div className="weather-card">
      {loading ? (
        <p className="weather-loading">Caricamento...</p>
      ) : error || !weather ? (
        <p className="weather-error">Meteo non disponibile</p>
      ) : (
        <>
          <h3 className="weather-city">
            {weather.city} <span className="weather-country">({weather.country})</span>
          </h3>
          <div className="weather-info">
            <div className="weather-temp">{Math.round(weather.temp)}°C</div>
            <div className="weather-condition">{weather.condition}</div>
          </div>
          <div className="weather-details">
            <span>💧 {weather.humidity}%</span>
            <span>🌬 {weather.wind} km/h</span>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherCarousel;
