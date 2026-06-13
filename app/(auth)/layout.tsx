import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 flex justify-center">
        <Image
          src="/logo.png"
          alt="Chai Biskit Cafe"
          width={166}
          height={136}
          priority
          className="h-28 w-auto object-contain"
        />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
