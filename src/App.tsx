import Desktop from "./modules/desktop/Desktop";
import { desktopApps } from "./apps";

function App() {
  return (
    <>
      <Desktop apps={desktopApps} />
    </>
  );
}

export default App;
