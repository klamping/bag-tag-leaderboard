import "./globals.css";

export const metadata = {
  title: "Bag Tag Leaderboard",
  description: "Public leaderboard for bag tag standings"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
