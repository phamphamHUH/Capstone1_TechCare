import { useState } from "react";
import api from "../../../../lib/axios";
import {
    departmentAfterRoleChange,
    LAB_ROOMS,
    LAB_STAFF_ROLE,
} from "./labRooms";

type Props = {
    onClose: () => void;
    loadData: () => void;
};

function AddUserModal({ onClose, loadData }: Props) {
    // =========================
    // Account Information
    // =========================
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [hiddenPassword, setHiddenPassword] = useState(true);

    // =========================
    // Personal Information
    // =========================
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [suffix, setSuffix] = useState("");
    const [sex, setSex] = useState("");
    const [birthdate, setBirthdate] = useState("");

    // =========================
    // Contact Information
    // =========================
    const [contactNumber, setContactNumber] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");

    // =========================
    // Emergency Contact
    // =========================
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContact, setEmergencyContact] = useState("");

    // =========================
    // Employment Information
    // =========================
    const [role, setRole] = useState("");
    const [department, setDepartment] = useState("");
    const [employmentStatus, setEmploymentStatus] = useState("");
    const [dateHired, setDateHired] = useState(
        new Date().toISOString().split("T")[0]
    );

    // =========================
    // Shift Schedule
    // =========================
    const [shiftStart, setShiftStart] = useState("08:00");
    const [shiftEnd, setShiftEnd] = useState("17:00");

    // =========================
    // Profile Photo
    // =========================
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // =========================
    // Profile Photo Handler
    // =========================
    const handlePhotoChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Profile photo must be smaller than 5MB.");
            return;
        }

        setProfilePhoto(file);

        const previewUrl = URL.createObjectURL(file);
        setPhotoPreview(previewUrl);
    };

    const removePhoto = () => {
        setProfilePhoto(null);
        setPhotoPreview(null);
    };

    // =========================
    // Register User
    // =========================
    const registerUser = async () => {
        // Required fields based on the users table
        if (
            !username ||
            !password ||
            !confirmPassword ||
            !firstName ||
            !lastName ||
            !sex ||
            !email ||
            !contactNumber ||
            !address ||
            !birthdate ||
            !role ||
            !dateHired
        ) {
            alert("Please fill out all required fields.");
            return;
        }

        if (role === LAB_STAFF_ROLE && !department) {
            alert("Please select a room for the laboratory staff.");
            return;
        }

        // Password confirmation
        if (password !== confirmPassword) {
            alert("Your passwords do not match.");
            return;
        }

        // Only validate shift if both were manually entered
        if (shiftStart && shiftEnd && shiftStart >= shiftEnd) {
            alert("Shift start time must be earlier than shift end time.");
            return;
        }

        try {
            const formData = new FormData();

            // =========================
            // Required Account Fields
            // =========================
            formData.append("username", username);
            formData.append("password", password);

            // =========================
            // Required Personal Fields
            // =========================
            formData.append("first_name", firstName);
            formData.append("last_name", lastName);
            formData.append("sex", sex);
            formData.append("birthdate", birthdate);

            // Optional Personal Fields
            if (middleName) {
                formData.append("middle_name", middleName);
            }

            if (suffix) {
                formData.append("suffix", suffix);
            }

            // =========================
            // Required Contact Fields
            // =========================
            formData.append("email", email);
            formData.append("contact_number", contactNumber);
            formData.append("address", address);

            // =========================
            // Optional Emergency Contact
            // =========================
            if (emergencyContactName) {
                formData.append(
                    "emergency_contact_name",
                    emergencyContactName
                );
            }

            if (emergencyContact) {
                formData.append(
                    "emergency_contact",
                    emergencyContact
                );
            }

            // =========================
            // Required Employment Fields
            // =========================
            formData.append("role", role);
            formData.append("date_hired", dateHired);

            // Optional Employment Fields
            if (department) {
                formData.append("department", department);
            }

            if (employmentStatus) {
                formData.append(
                    "employment_status",
                    employmentStatus
                );
            }

            // =========================
            // Optional Shift Fields
            // =========================
            // If empty, the database defaults are used:
            // shift_start = 08:00:00
            // shift_end = 17:00:00

            if (shiftStart) {
                formData.append("shift_start", shiftStart);
            }

            if (shiftEnd) {
                formData.append("shift_end", shiftEnd);
            }

            // =========================
            // Optional Profile Photo
            // =========================
            if (profilePhoto) {
                formData.append(
                    "image",
                    profilePhoto
                );
            }

            // =========================
            // API Request
            // =========================
            const response = await api.post(
                "/api/admin/add-user",
                formData
            );

            alert(response.data.message);

            onClose();
            loadData();
        } catch (error: unknown) {
            alert(
                (
                    error as {
                        response?: {
                            data?: {
                                message?: string;
                            };
                        };
                    }
                ).response?.data?.message ||
                "Something went wrong"
            );

            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl bg-white p-6 shadow-xl">

                {/* =========================
                    HEADER
                ========================= */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                        Add User
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="border px-4 py-2 hover:bg-gray-100"
                    >
                        X
                    </button>
                </div>

                <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-2">

                    {/* =========================
                        ACCOUNT INFORMATION
                    ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Account Information
                        </h3>

                        <div className="space-y-3">

                            {/* Username */}
                            <input
                                type="text"
                                placeholder="Username *"
                                className="w-full border p-2"
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                            />

                            {/* Password */}
                            <div className="flex border">
                                <input
                                    type={
                                        hiddenPassword
                                            ? "password"
                                            : "text"
                                    }
                                    placeholder="Password *"
                                    className="w-full p-2 outline-none"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />

                                <button
                                    type="button"
                                    className="px-3 hover:bg-gray-100"
                                    onClick={() =>
                                        setHiddenPassword(
                                            !hiddenPassword
                                        )
                                    }
                                >
                                    {hiddenPassword
                                        ? "Show"
                                        : "Hide"}
                                </button>
                            </div>

                            {/* Confirm Password */}
                            <input
                                type="password"
                                placeholder="Confirm Password *"
                                className="w-full border p-2"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </section>

                    {/* =========================
                        PROFILE PHOTO
                    ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Profile Photo
                        </h3>

                        <div className="flex items-center gap-5">

                            {/* Preview */}
                            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gray-100">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Profile preview"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">
                                        No Photo
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={handlePhotoChange}
                                    className="block"
                                />

                                <p className="text-xs text-gray-500">
                                    JPG, PNG, or WEBP. Maximum 5MB.
                                </p>

                                {profilePhoto && (
                                    <button
                                        type="button"
                                        onClick={removePhoto}
                                        className="text-sm text-red-600 hover:underline"
                                    >
                                        Remove Photo
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* =========================
                        PERSONAL INFORMATION
                    ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Personal Information
                        </h3>

                        <div className="grid grid-cols-2 gap-3">

                            {/* First Name */}
                            <input
                                type="text"
                                placeholder="First Name *"
                                className="border p-2"
                                value={firstName}
                                onChange={(e) =>
                                    setFirstName(e.target.value)
                                }
                            />

                            {/* Middle Name */}
                            <input
                                type="text"
                                placeholder="Middle Name"
                                className="border p-2"
                                value={middleName}
                                onChange={(e) =>
                                    setMiddleName(e.target.value)
                                }
                            />

                            {/* Last Name */}
                            <input
                                type="text"
                                placeholder="Last Name *"
                                className="border p-2"
                                value={lastName}
                                onChange={(e) =>
                                    setLastName(e.target.value)
                                }
                            />

                            {/* Suffix */}
                            <input
                                type="text"
                                placeholder="Suffix"
                                className="border p-2"
                                value={suffix}
                                onChange={(e) =>
                                    setSuffix(e.target.value)
                                }
                            />

                            {/* Sex */}
                            <select
                                className="border p-2"
                                value={sex}
                                onChange={(e) =>
                                    setSex(e.target.value)
                                }
                            >
                                <option value="">
                                    Select Sex *
                                </option>

                                <option value="Male">
                                    Male
                                </option>

                                <option value="Female">
                                    Female
                                </option>
                            </select>

                            {/* Birthdate */}
                            <input
                                type="date"
                                className="border p-2"
                                value={birthdate}
                                onChange={(e) =>
                                    setBirthdate(e.target.value)
                                }
                            />
                        </div>
                    </section>

                    {/* =========================
                        CONTACT INFORMATION
                    ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Contact Information
                        </h3>

                        <div className="space-y-3">

                            {/* Contact Number */}
                            <input
                                type="text"
                                placeholder="Contact Number *"
                                className="w-full border p-2"
                                value={contactNumber}
                                onChange={(e) =>
                                    setContactNumber(
                                        e.target.value
                                    )
                                }
                            />

                            {/* Email */}
                            <input
                                type="email"
                                placeholder="Email *"
                                className="w-full border p-2"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                            />

                            {/* Address */}
                            <textarea
                                placeholder="Address *"
                                rows={3}
                                className="w-full border p-2"
                                value={address}
                                onChange={(e) =>
                                    setAddress(e.target.value)
                                }
                            />
                        </div>
                    </section>

                    {/* =========================
                        EMERGENCY CONTACT
                    ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Emergency Contact
                        </h3>

                        <div className="grid grid-cols-2 gap-3">

                            {/* Emergency Contact Name */}
                            <input
                                type="text"
                                placeholder="Emergency Contact Name"
                                className="border p-2"
                                value={emergencyContactName}
                                onChange={(e) =>
                                    setEmergencyContactName(
                                        e.target.value
                                    )
                                }
                            />

                            {/* Emergency Contact Number */}
                            <input
                                type="text"
                                placeholder="Emergency Contact Number"
                                className="border p-2"
                                value={emergencyContact}
                                onChange={(e) =>
                                    setEmergencyContact(
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </section>

                    {/* =========================
                        EMPLOYMENT INFORMATION
                    ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Employment Information
                        </h3>

                        <div className="grid grid-cols-2 gap-3">

                            {/* Role */}
                            <select
                                className="border p-2"
                                value={role}
                                onChange={(e) => {
                                    setDepartment(
                                        departmentAfterRoleChange(
                                            role,
                                            e.target.value,
                                            department
                                        )
                                    );
                                    setRole(e.target.value);
                                }}
                            >
                                <option value="">
                                    Select Role *
                                </option>

                                <option value="admin">
                                    Admin
                                </option>

                                <option value="doctor">
                                    Doctor
                                </option>

                                <option value="laboratory-staff">
                                    Laboratory Staff
                                </option>

                                <option value="frontdesk-staff">
                                    Front Desk Staff
                                </option>

                            </select>

                            {/* Room for laboratory staff, department for everyone else */}
                            {role === LAB_STAFF_ROLE ? (
                                <select
                                    className="border p-2"
                                    value={department}
                                    onChange={(e) =>
                                        setDepartment(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        Select Room *
                                    </option>

                                    {LAB_ROOMS.map((room) => (
                                        <option
                                            key={room.value}
                                            value={room.value}
                                        >
                                            {room.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Department"
                                    className="border p-2"
                                    value={department}
                                    onChange={(e) =>
                                        setDepartment(
                                            e.target.value
                                        )
                                    }
                                />
                            )}

                            {/* Employment Status */}
                            <select
                                className="border p-2"
                                value={employmentStatus}
                                onChange={(e) =>
                                    setEmploymentStatus(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select Employment Status
                                </option>

                                <option value="active">
                                    Active
                                </option>

                                <option value="inactive">
                                    Inactive
                                </option>

                                <option value="on-leave">
                                    On Leave
                                </option>
                            </select>

                            {/* Date Hired */}
                            <div className="flex flex-col gap-1">
                                <label
                                    htmlFor="date-hired"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Date Hired <span className="text-red-500">*</span>
                                </label>

                                <input
                                    id="date-hired"
                                    type="date"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={dateHired}
                                    onChange={(e) => setDateHired(e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    {/* =========================
                            SHIFT SCHEDULE
                        ========================= */}
                    <section>
                        <h3 className="mb-3 border-b pb-2 text-lg font-semibold">
                            Shift Schedule
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Shift Start
                                </label>

                                <input
                                    type="time"
                                    className="w-full border p-2"
                                    value={shiftStart}
                                    onChange={(e) =>
                                        setShiftStart(e.target.value)
                                    }
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Shift End
                                </label>

                                <input
                                    type="time"
                                    className="w-full border p-2"
                                    value={shiftEnd}
                                    onChange={(e) =>
                                        setShiftEnd(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* =========================
                    FOOTER
                ========================= */}
                <div className="mt-6 flex justify-end gap-3">

                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-200 px-4 py-2 hover:bg-gray-300"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={registerUser}
                        className="bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        Add User
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddUserModal;