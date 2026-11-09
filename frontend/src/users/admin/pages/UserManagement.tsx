import EmptyState from "../../../components/EmptyState";
import ErrorMessage from "../../../components/ErrorMessage";
import LoadingScreen from "../../../components/LoadingScreen";
import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";

import type { User } from "../../../interface/User";
import AddUserModal from "../components/UserManagement/AddUserModal";
import UpdateUserModal from "../components/UserManagement/UpdateUserModal";
import UserCardSquare from "../components/UserManagement/UserCardSquare";
import UserProfile from "../components/UserManagement/UserProfile";

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = users.filter((user) => {
    const searchValue = search.toLowerCase().trim();

    return (
      user.username?.toLowerCase().includes(searchValue) ||
      user.email?.toLowerCase().includes(searchValue) ||
      user.role?.toLowerCase().includes(searchValue) ||
      user.contact_number?.toLowerCase().includes(searchValue)
    );
  });

  return (
    <main className="flex-1 min-w-0 ">
      {/* =========================
    SEARCH / ACTION BAR
========================== */}
      <div className="flex items-center gap-6 mb-6 px-6">
        {/* Users */}
        <div className="shrink-0">
          <h2 className="text-2xl font-semibold">Users</h2>

          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xl">
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
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-gray-500"
          />
        </div>

        {/* Add User */}
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <UserPlus size={18} strokeWidth={1.5} />
          Add User
        </button>
      </div>

      {error && <ErrorMessage className="mx-6 mb-5">{error}</ErrorMessage>}

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

      {loading && users.length === 0 ? (
        <LoadingScreen message="Loading users..." />
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 px-6">
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
        <div className="mx-6">
          <EmptyState
            message={error ? "Users are unavailable." : "No users found."}
            description={
              error
                ? "The list will reappear when data is available."
                : search.trim()
                  ? "Try changing or clearing your search."
                  : "Users will appear here once they are added."
            }
          />
        </div>
      )}

      {/* 
            =========================
            PREVIOUS TABLE IMPLEMENTATION
            =========================

            <div className="w-full overflow-x-auto">
                <table className="min-w-full border border-gray-300">
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
