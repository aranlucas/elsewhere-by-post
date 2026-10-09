import { Link } from "react-router";

export function MakerIntro() {
  return (
    <>
      <header className="masthead">
        <span className="edition">THE ELSEWHERE POSTAL SERVICE</span>
        <Link to="/" className="quiet">
          ← Back to the postcards
        </Link>
      </header>
      <div className="maker-intro">
        <p className="eyebrow">ONE SMALL WORLD, ENTIRELY YOURS</p>
        <h1>
          The Mapmaker’s <em>Desk.</em>
        </h1>
        <p>
          Build a route, then give the world a shuffle. Your maps stay on this device, or travel as
          a little JSON file.
        </p>
      </div>
    </>
  );
}
