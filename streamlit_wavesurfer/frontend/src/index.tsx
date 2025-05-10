import React from "react"
import ReactDOM from "react-dom/client"
import WavesurferComponent from "@/WavesurferComponent"
import "@/index.css"
import { Provider as JotaiProvider } from "jotai"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');
const queryClient = new QueryClient()
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <WavesurferComponent />
      </JotaiProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
