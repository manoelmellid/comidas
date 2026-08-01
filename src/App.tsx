import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HoyScreen } from './screens/HoyScreen';
import { ComidasScreen } from './screens/ComidasScreen';
import { PlatosScreen } from './screens/PlatosScreen';
import { IngredientesScreen } from './screens/IngredientesScreen';
import { RestriccionesScreen } from './screens/RestriccionesScreen';
import { RestriccionesDiariasScreen } from './screens/RestriccionesDiariasScreen';
import { RestriccionesGlobalesScreen } from './screens/RestriccionesGlobalesScreen';
import { AjustesScreen } from './screens/AjustesScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HoyScreen />} />
          <Route path="/comidas" element={<ComidasScreen />} />
          <Route path="/platos" element={<PlatosScreen />} />
          <Route path="/ingredientes" element={<IngredientesScreen />} />
          <Route path="/restricciones" element={<RestriccionesScreen />} />
          <Route path="/restricciones/diarias" element={<RestriccionesDiariasScreen />} />
          <Route path="/restricciones/globales" element={<RestriccionesGlobalesScreen />} />
          <Route path="/ajustes" element={<AjustesScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
