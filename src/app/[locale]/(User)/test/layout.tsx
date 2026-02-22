export default function Layout({
  children,
  test1,
  test2,
}: {
  children: React.ReactNode;
  test1: React.ReactNode;
  test2: React.ReactNode;
}) {
  return (
    <div className="ml-[500px] mt-20">
      <div className="ml-[150px]">{children}</div>

      <div className="flex">
        {test1}
        {test2}
      </div>
    </div>
  );
}
