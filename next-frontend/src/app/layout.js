import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GitShare",
  description: "Share Your GitHub Repos With Anyone, Temporarily",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-black text-white selection:bg-white selection:text-black`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#000',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '8px',
              fontFamily: 'inherit',
            },
            success: {
              iconTheme: { primary: '#fff', secondary: '#000' },
            },
            error: {
              iconTheme: { primary: '#fff', secondary: '#000' },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
