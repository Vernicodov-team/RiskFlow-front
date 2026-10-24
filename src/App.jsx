import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Customers from "./pages/Customers";
import CustomerCard from "./pages/CustomerCard";
import ModelSettings from "./pages/ModelSettings";
import SourceData from "./pages/SourceData";
import { RealtimeProvider } from "./context/RealtimeContext";

function App() {
  const [activePage, setActivePage] = useState("Обзор");

  function renderPage() {
    switch (activePage) {
      case "Обзор":
        return <Overview />;

      case "Клиенты":
        return <Customers />;

      case "Карточка клиента":
        return <CustomerCard />;

      case "Настройка модели":
        return <ModelSettings />;

      case "Данные":
        return <SourceData />;

      case "Вход":
        return <Login />;

      default:
        return <Overview />;
    }
  }

  return (
  <RealtimeProvider>
    <div className="min-h-screen">
      <Sidebar />
      <main>{renderPage()}</main>
    </div>
  </RealtimeProvider>
);
}

export default App;