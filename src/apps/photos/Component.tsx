import type { AppWindowComponentProps } from "../types";
import { FileTypes } from "../fileTypes";
import { imageFileDataSchema } from "./schema";

const PhotosComponent = ({ fileContext }: AppWindowComponentProps) => {
  const imageData =
    fileContext?.type === FileTypes.image
      ? imageFileDataSchema.safeParse(fileContext.data).data
      : undefined;

  if (imageData?.url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black/20 p-4">
        <img
          src={imageData.url}
          alt={imageData.alt ?? fileContext?.name ?? "Image"}
          className="max-h-full max-w-full rounded-md object-contain shadow-xl"
        />
      </div>
    );
  }

  return <div className="p-4 text-sm text-muted-foreground">No image selected.</div>;
};

export default PhotosComponent;
