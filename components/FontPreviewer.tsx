import React, { useState, useEffect, useRef, useMemo } from 'react';

// Curated list of popular Google Fonts
const GOOGLE_FONTS = [
  'DM Sans',
  'Inter',
  'Space Mono',
  'Space Grotesk',
  'IBM Plex Sans',
  'Manrope',
  'Montserrat',
  'Lato',
  'PT Sans',
  'PT Serif',
  'Cardo',
  'Chivo',
  'Neuton',
  'Rubik',
  'Alegreya Sans',
  'Alegreya',
  'Source Sans Pro',
  'Source Serif Pro',
  'Roboto',
  'Fraunces',
  'Inknut Antiqua',
  'BioRhyme',
  'Poppins',
  'Archivo Narrow',
  'Libre Baskerville',
  'Playfair Display',
  'Karla',
  'Lora',
  'Proza Libre',
  'Spectral',
  'Open Sans',
  'Inconsolata',
  'Raleway',
  'Merriweather',
  'Tangerine',
  'Dancing Script',
  'Bad Script',
  'Sacramento',
  'Opendyslexic'
].sort();

// Use a Set to track fonts that have been requested to avoid duplicate <link> tags.
const loadedFonts = new Set<string>();

const loadFont = (fontName: string) => {
  if (loadedFonts.has(fontName)) return;

  const fontId = `google-font-preview-${fontName.replace(/\s/g, '-')}`;
  if (document.getElementById(fontId)) {
    loadedFonts.add(fontName);
    return;
  }

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s/g, '+')}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
};

interface FontItemProps {
  fontName: string;
  onSelect: (fontName: string) => void;
}

const FontItem: React.FC<FontItemProps> = ({ fontName, onSelect }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          loadFont(fontName);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' } // Preload fonts 300px before they enter the viewport
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
        if(currentRef) {
            observer.unobserve(currentRef);
        }
    }
  }, [fontName]);

  return (
    <button
      ref={ref}
      onClick={() => onSelect(fontName)}
      className="w-full text-left p-3 text-lg rounded-md hover:bg-hover text-primary transition-colors"
      style={{ fontFamily: isVisible ? `'${fontName}', sans-serif` : 'sans-serif', minHeight: '48px' }}
      title={`Select font: ${fontName}`}
    >
      {isVisible ? fontName : 'Loading...'}
    </button>
  );
};

interface FontPreviewerProps {
  onSelectFont: (fontName: string) => void;
}

export const FontPreviewer: React.FC<FontPreviewerProps> = ({ onSelectFont }) => {
  const [search, setSearch] = useState('');

  const filteredFonts = useMemo(() => {
    if (!search) return GOOGLE_FONTS;
    return GOOGLE_FONTS.filter(font =>
      font.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="flex flex-col h-[70vh]">
      <input
        type="search"
        placeholder="Search fonts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-primary border border-secondary rounded-md p-2 mb-4 focus:ring-2 focus:ring-accent outline-none flex-shrink-0"
        autoFocus
      />
      <div className="flex-grow overflow-y-auto pr-2">
        {filteredFonts.map(font => (
          <FontItem key={font} fontName={font} onSelect={onSelectFont} />
        ))}
        {filteredFonts.length === 0 && <p className="text-secondary text-center py-4">No fonts found.</p>}
      </div>
    </div>
  );
};
