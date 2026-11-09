import LoadingScreen from "../../../components/LoadingScreen";
import Header from "#components/Header";
import ErrorMessage from "../../../components/ErrorMessage";

type LaboratoryDashboardProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  error?: string | null;
};

function LabstaffDashboard({
  open,
  setOpen,
  loadData,
  loading,
  error,
}: LaboratoryDashboardProps) {
  return (
    <main className="flex-1 min-w-0 border-gray-300">
      <Header
        page="Dashboard"
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
      />
      {loading && <LoadingScreen variant="page" message="Loading laboratory data..." />}
      {!loading && error && <ErrorMessage className="mx-6">{error}</ErrorMessage>}
    </main>
  );
}
export default LabstaffDashboard;
