export default function PhoneIcon({
  className = "h-[18px] w-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 01.98-.24c1.08.29 2.22.44 3.41.44a1 1 0 011 1V20a1 1 0 01-1 1C10.3 21 3 13.7 3 4a1 1 0 011-1h3.42a1 1 0 011 1c0 1.19.15 2.33.44 3.41a1 1 0 01-.25.98l-2.39 2.4z" />
    </svg>
  );
}