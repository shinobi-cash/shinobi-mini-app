interface SplashScreenProps {
  subtitle?: string;
}

export const SplashScreen = ({ subtitle }: SplashScreenProps) => (
  <div className="min-h-screen bg-app-background flex flex-col items-center justify-center px-2 py-2 sm:px-4 sm:py-4">
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-app-primary mb-3 font-sans animate-bounce">shinobi.cash</h1>
      {subtitle && <p className="text-app-secondary text-lg animate-pulse">{subtitle}</p>}
    </div>
  </div>
);
