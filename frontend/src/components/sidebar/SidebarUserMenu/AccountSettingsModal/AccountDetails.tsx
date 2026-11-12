import { accountFields, type AccountUser } from "./utils/accountFields";

function AccountDetails({ user }: { user: AccountUser }) {
  const fields = accountFields(user);

  return (
    <dl className="grid grid-cols-1 overflow-hidden rounded-md border border-gray-300 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.label}
          className={`min-w-0 border-b border-gray-200 px-3 py-2.5 last:border-b-0 sm:odd:border-r ${
            field.label === "Address" ? "sm:col-span-2 sm:border-r-0" : ""
          }`}
        >
          <dt className="text-xs text-gray-500">{field.label}</dt>
          <dd className="mt-0.5 text-sm text-gray-900 [overflow-wrap:anywhere]">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default AccountDetails;
