import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HoyScreen } from './screens/HoyScreen';
import { ComidasScreen } from './screens/ComidasScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HoyScreen />} />
          <Route path="/comidas" element={<ComidasScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
