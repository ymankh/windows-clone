
type Orientation = "landscape" | "portrait";
type SortOrder = "recent" | "vibe";

type Photo = {
  id: string;
  title: string;
  album: string;
  src: string;
  location: string;
  takenAt: string;
  tags: string[];
  orientation: Orientation;
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: number;
  rating: number;
  mood: string;
  accent: [string, string];
  favorite?: boolean;
};

const PhotosComponent = () => {
  return (
    <div >
        Photos App Component
    </div>
  );
};

export default PhotosComponent;
