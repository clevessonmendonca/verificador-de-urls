import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import "./modal.css";

interface UrlRecord {
  URL: string;
  Status: string;
}

const UrlChecker: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [records, setRecords] = useState<UrlRecord[]>([]);
  const [history, setHistory] = useState<
    { baseUrl: string; records: UrlRecord[] }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [, setSocket] = useState<unknown>(null);

  // Generate a unique room ID for the user (e.g., using sessionStorage)
  const room = sessionStorage.getItem("room") || `room-${Date.now()}`;
  sessionStorage.setItem("room", room);

  useEffect(() => {
    const newSocket = io("http://localhost:5000");

    newSocket.on("connect", () => {
      console.log("Connected to server");
      newSocket.emit("join", { room });
    });

    newSocket.on("url_record", (record: UrlRecord) => {
      setRecords((prevRecords) => [...prevRecords, record]);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave", { room });
      newSocket.disconnect();
    };
  }, [room]);

  const handleCheckUrls = async () => {
    if (!baseUrl) {
      setError("Por favor, insira uma URL base.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setHistory((prevHistory) => [...prevHistory, { baseUrl, records }]);
      setRecords([]);

      await axios.get("http://localhost:5000/check-urls", {
        params: { base_url: baseUrl, room },
      });
    } catch (err) {
      setError("Erro ao verificar URLs. Por favor, tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const totalRecords = records.length;
  const economyOrSepladRecords = records.filter(
    (record) =>
      record.URL.toLowerCase().includes("economia") ||
      record.URL.toLowerCase().includes("seplad")
  ).length;
  const okRecords = records.filter(
    (record) => record.Status.toLowerCase() === "ok"
  ).length;

  return (
    <div className="check-container">
      <h1>Verificador de URLs</h1>
      <div className="check-buttons">
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Digite a URL base para verificar"
        />
        <button
          className="button-primary"
          onClick={handleCheckUrls}
          disabled={loading}
        >
          {loading ? "Verificando..." : "Verificar"}
        </button>
        <button className="download-button" onClick={toggleModal}>
          Ver Histórico
        </button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {totalRecords === 0 ? (
        <p>Nenhum arquivo encontrado.</p>
      ) : (
        <ul>
          {records.map((record, index) => (
            <li key={index}>
              <a href={record.URL} target="_blank" rel="noopener noreferrer">
                {record.URL}
              </a>
              <span
                className={`card-status ${
                  record.Status.toLowerCase() === "ok"
                    ? "status-ok"
                    : "status-error"
                }`}
              >
                {record.Status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="summary">
        <p>Total de arquivos: {totalRecords}</p>
        <p>
          Arquivos com "economia" ou "seplad" na URL: {economyOrSepladRecords}
        </p>
        <p>Status OK: {okRecords}</p>
      </div>

      {/* Modal para o histórico */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Histórico de URLs</h2>
            <button className="button-close" onClick={toggleModal}>
              Fechar
            </button>
            {history.length === 0 ? (
              <p>Não há histórico disponível.</p>
            ) : (
              history.map(({ baseUrl, records }, index) => (
                <div key={index} className="historical-records">
                  <h3>URL Base: {baseUrl}</h3>
                  {records.length === 0 ? (
                    <p>Nenhum arquivo encontrado.</p>
                  ) : (
                    <ul>
                      {records.map((record, idx) => (
                        <li key={idx}>
                          <a
                            href={record.URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {record.URL}
                          </a>
                          <span
                            className={`card-status ${
                              record.Status.toLowerCase() === "ok"
                                ? "status-ok"
                                : "status-error"
                            }`}
                          >
                            {record.Status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlChecker;
