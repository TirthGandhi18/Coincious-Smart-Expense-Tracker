import { Button } from '../ui/button';
import { useAuth } from '../../App';

export function SimpleDashboard() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logout button in top right */}
      <Button
        variant="outline"
        className="absolute top-4 right-4"
        onClick={logout}
      >
        Logout
      </Button>

      {/* Large Dashboard text */}
      <h1 className="text-8xl md:text-9xl font-bold text-primary text-center">
        Dashboard
      </h1>
      
      {/* Optional subtitle */}
      <p className="text-2xl text-muted-foreground mt-8 text-center">
        Welcome to your dashboard
      </p>
    </div>
  );
}