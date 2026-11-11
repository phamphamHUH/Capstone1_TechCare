import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import LoadingRegion from "../../../components/LoadingRegion";
import { useEffect, useState } from "react";
import { LayoutGrid, List, Search, UserPlus } from "lucide-react";

import type { User } from "../../../interface/User";
import AddUserModal from "../components/UserManagement/AddUserModal";
import UpdateUserModal from "../components/UserManagement/UpdateUserModal";
import UserCardRow from "../components/UserManagement/UserCardRow";
import UserCardSquare from "../components/UserManagement/UserCardSquare";
import UserFilters from "../components/UserManagement/UserFilters";
import {
  DEFAULT_USER_FILTERS,
  isFiltered,
  matchesFilters,
  matchesSearch,
  type UserFilterValues,
} from "../components/UserManagement/utils/userFilterValues";
import UserProfile from "../components/UserManagement/UserProfile";

type ViewMode = "grid" | "list";
const VIEW_MODE_KEY = "admin.userManagement.viewMode";

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

type UserManagementProps = {
  users: User[];
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error?: string;
};

function UserManagement({
  users,
  loadData,
  loading,
  error,
}: UserManagementProps) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [showUpdateUser, setShowUpdateUser] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User>(users[0]);
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const [filters, setFilters] =
    useState<UserFilterValues>(DEFAULT_USER_FILTERS);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // storage unavailable — the choice just won't persist
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roleOptions = [
    ...new Set(users.map((u) => u.role).filter(Boolean)),
  ].sort();
  const departmentOptions = [
    ...new Set(users.map((u) => u.department).filter((d): d is string => !!d)),
  ].sort();
  const hasUnassignedDepartment = users.some((u) => !u.department);

  const filteredUsers = users.filter(
    (user) => matchesFilters(user, filters) && matchesSearch(user, search),
  );

  return (
    <main className="flex-1 min-w-0 ">
      {/* =========================
    SEARCH / ACTION BAR
========================== */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-3 px-4 sm:px-6">
        {/* Users */}
        <div className="shrink-0">
          <h2 className="text-2xl font-semibold">Users</h2>

          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>

        {/* Search */}
        <div className="relative order-last basis-full sm:order-none sm:basis-auto flex-1 max-w-xl">
          <Search
            size={19}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2.5 outline-none focus:border-gray-500"
          />
        </div>

        {/* View toggle */}
        <div className="flex shrink-0 overflow-hidden rounded-md border border-gray-300">
          {(
            [
              { mode: "grid", label: "Grid view", Icon: LayoutGrid },
              { mode: "list", label: "List view", Icon: List },
            ] as const
          ).map(({ mode, label, Icon }) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={viewMode === mode}
              onClick={() => changeViewMode(mode)}
              className={`px-3 py-2.5 transition-colors cursor-pointer ${
                viewMode === mode
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
            </button>
          ))}
        </div>

        {/* Add User */}
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <UserPlus size={18} strokeWidth={1.5} />
          Add User
        </button>
      </div>

      <UserFilters
        filters={filters}
        setFilters={setFilters}
        roleOptions={roleOptions}
        departmentOptions={departmentOptions}
        hasUnassignedDepartment={hasUnassignedDepartment}
      />

      {error && <ErrorMessage className="mx-4 sm:mx-6 mb-5">{error}</ErrorMessage>}

      {/* =========================
                MODALS
            ========================== */}

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          loadData={loadData}
        />
      )}

      {showUpdateUser && (
        <UpdateUserModal
          user={selectedUser}
          onClose={() => setShowUpdateUser(false)}
          loadData={loadData}
        />
      )}

      {showUserProfile && (
        <UserProfile
          loadData={loadData}
          user={selectedUser}
          onBack={() => setShowUserProfile(false)}
          setShowUpdateUser={() => setShowUpdateUser(true)}
          setSelectedUser={setSelectedUser}
        />
      )}

      {/* =========================
                USER GRID
            ========================== */}

      <LoadingRegion
        loading={loading && users.length > 0}
        message="Refreshing users..."
      >
        {loading && users.length === 0 ? (
          <LoadingScreen message="Loading users..." />
        ) : filteredUsers.length > 0 && viewMode === "list" ? (
          <div className="flex flex-col gap-3 px-4 sm:px-6">
            {filteredUsers.map((user) => (
              <UserCardRow
                key={user.user_id}
                user={user}
                setSelectedUser={setSelectedUser}
                setShowUserProfile={setShowUserProfile}
              />
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 px-4 sm:px-6">
            {filteredUsers.map((user) => (
              <UserCardSquare
                key={user.user_id}
                user={user}
                setSelectedUser={setSelectedUser}
                setShowUserProfile={setShowUserProfile}
              />
            ))}
          </div>
        ) : (
          <div className="mx-4 sm:mx-6">
            <EmptyState
              message={error ? "Users are unavailable." : "No users found."}
              description={
                error
                  ? "The list will reappear when data is available."
                  : search.trim() || isFiltered(filters)
                    ? "Try changing or clearing your search and filters."
                    : "Users will appear here once they are added."
              }
            />
          </div>
        )}
      </LoadingRegion>

      {/* 
            =========================
            PREVIOUS TABLE IMPLEMENTATION
            =========================

            <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[860px] border border-gray-300">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="border p-3 text-left">ID</th>
                            <th className="border p-3 text-left">Username</th>
                            <th className="border p-3 text-left">Role</th>
                            <th className="border p-3 text-left">Contact Number</th>
                            <th className="border p-3 text-left">Email</th>
                            <th className="border p-3 text-left">Created At</th>
                            <th className="border p-3 text-left">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr
                                key={user.user_id}
                                className="hover:bg-gray-100"
                            >
                                <td className="border p-3">
                                    {user.user_id}
                                </td>

                                <td className="border p-3">
                                    {user.username}
                                </td>

                                <td className="border p-3">
                                    {user.role}
                                </td>

                                <td className="border p-3">
                                    {user.contact_number}
                                </td>

                                <td className="border p-3">
                                    {user.email}
                                </td>

                                <td className="border p-3">
                                    {new Date(
                                        user.created_at
                                    ).toLocaleString()} PHT
                                </td>

                                <td className="border p-3">
                                    <div className="flex justify-center items-center gap-2">
                                        <button
                                            className="bg-gray-200 px-4 py-2 hover:bg-gray-400"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setShowUpdateUser(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            */}
    </main>
  );
}

export default UserManagement;
