import { createRoot } from 'react-dom/client';
import { NotFoundPage } from './features/not-found/NotFoundPage';
import './404.css';

const root = document.getElementById('not-found-root');
if (!root) throw new Error('Missing 404 page root.');

createRoot(root).render(<NotFoundPage />);
