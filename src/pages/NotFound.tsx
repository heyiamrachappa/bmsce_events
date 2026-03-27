import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 selection:bg-primary/30">
      <div className="text-center space-y-8">
        <span className="text-[10px] font-[900] text-primary uppercase tracking-[0.4em]">SYSTEM / ERROR</span>
        <h1 className="text-[25vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-white">
          4<span className="text-white/10">0</span>4
        </h1>
        <p className="text-[10px] font-[900] text-white/20 uppercase tracking-widest max-w-xs mx-auto">
          TARGET ROUTE NOT FOUND. THE REQUESTED ASSET DOES NOT EXIST IN THIS DIMENSION.
        </p>
        <Link to="/" className="inline-block mt-8">
          <button className="h-16 px-12 rounded-full bg-white text-black text-[10px] font-[900] uppercase tracking-widest hover:bg-primary transition-all active:scale-95">
            RETURN TO BASE
          </button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
