import { silhouettes } from "../../data/scaleSilhouettes";

/*
 * One silhouette, drawn to a pixel height. Width follows from the shape's
 * own aspect ratio, which is what makes a bus look like a bus next to a
 * lamp post rather than both being squares.
 */

type SilhouetteProps = {
  shapeKey: string;
  /** Pixel height. The width is whatever the shape's proportions give. */
  height: number;
  className?: string;
};

function Silhouette({
  shapeKey,
  height,
  className,
}: SilhouetteProps) {
  const shape =
    silhouettes[shapeKey];

  if (!shape) {
    return null;
  }

  const width =
    (shape.width / 100) * height;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${shape.width} 100`}
      aria-hidden="true"
      focusable="false"
    >
      <g
        transform={`scale(${shape.scale}) translate(${
          shape.offset[0] / shape.scale
        } ${shape.offset[1] / shape.scale})`}
      >
        {shape.paths.map((d, index) => (
          <path
            key={index}
            d={d}
            fillRule={
              shape.evenodd
                ? "evenodd"
                : "nonzero"
            }
          />
        ))}
      </g>
    </svg>
  );
}

export default Silhouette;
