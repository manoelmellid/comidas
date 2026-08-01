import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HoyScreen } from './screens/HoyScreen';
import { ComidasScreen } from './screens/ComidasScreen';
import { PlatosScreen } from './screens/PlatosScreen';
import { RestriccionesScreen } from './screens/RestriccionesScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HoyScreen />} />
          <Route path="/comidas" element={<ComidasScreen />} />
          <Route path="/platos" element={<PlatosScreen />} />
          <Route path="/restricciones" element={<RestriccionesScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
