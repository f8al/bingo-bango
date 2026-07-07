/** Top-level app: providers, router, and route table. */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTER_BASENAME } from './config';
import { BatchProvider } from './ui/state';
import { Layout } from './ui/components/Layout';
import { Home } from './ui/routes/Home';
import { Callback } from './ui/routes/Callback';
import { Generate } from './ui/routes/Generate';
import { CardView } from './ui/routes/CardView';
import { Call } from './ui/routes/Call';

export function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <BatchProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/card/:id" element={<CardView />} />
            <Route path="/call" element={<Call />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BatchProvider>
    </BrowserRouter>
  );
}
