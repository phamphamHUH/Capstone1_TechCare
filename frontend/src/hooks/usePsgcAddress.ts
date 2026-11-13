import { useEffect, useState } from "react";

// Philippine address lists (province → city/municipality → barangay) from the
// public PSGC API (Philippine Standard Geographic Code). Only place codes are
// sent to it, never patient data. The form still stores the place *names* in
// patients.province / city / barangay, as before.
//
// If the API can't be reached, `failed` is true and the form shows plain text
// inputs instead, so registration never gets blocked.

type Place = { code: string; name: string };

const BASE = "https://psgc.gitlab.io/api";

// Metro Manila (NCR) has no provinces; its cities hang off the region.
export const METRO_MANILA = "Metro Manila";
const NCR_CODE = "130000000";

// Two independent cities have no province in PSGC; list them under the
// province they sit in.
const EXTRA_CITIES: Record<string, Place[]> = {
  Basilan: [{ code: "099701000", name: "City of Isabela" }],
  Maguindanao: [{ code: "129804000", name: "City of Cotabato" }],
};

// One request per list per page load, shared by every form.
const cache = new Map<string, Promise<Place[]>>();

function load(path: string): Promise<Place[]> {
  let request = cache.get(path);
  if (!request) {
    request = fetch(`${BASE}/${path}`)
      .then((response) => {
        if (!response.ok) throw new Error(`PSGC ${response.status}`);
        return response.json() as Promise<Place[]>;
      })
      .then((rows) => rows.map(({ code, name }) => ({ code, name })))
      .catch((error) => {
        cache.delete(path); // let a later render try again
        throw error;
      });
    cache.set(path, request);
  }
  return request;
}

const byName = (a: Place, b: Place) => a.name.localeCompare(b.name);

// The saved value stays selectable even if it isn't in the list
// (older records were typed by hand).
const namesWith = (places: Place[], current: string) => {
  const names = places.map((p) => p.name);
  return current && !names.includes(current) ? [current, ...names] : names;
};

const PROVINCES_PATH = "provinces.json";
const citiesPath = (provinceCode: string) =>
  provinceCode === NCR_CODE
    ? `regions/${NCR_CODE}/cities-municipalities.json`
    : `provinces/${provinceCode}/cities-municipalities.json`;
const barangaysPath = (cityCode: string) =>
  `cities-municipalities/${cityCode}/barangays.json`;

export function usePsgcAddress(
  province: string,
  city: string,
  barangay: string,
) {
  // Loaded lists, keyed by their API path.
  const [lists, setLists] = useState<Record<string, Place[]>>({});
  const [failed, setFailed] = useState(false);

  const store = (path: string) => (places: Place[]) =>
    setLists((current) => ({ ...current, [path]: places }));

  useEffect(() => {
    load(PROVINCES_PATH)
      .then((places) =>
        store(PROVINCES_PATH)(
          [...places, { code: NCR_CODE, name: METRO_MANILA }].sort(byName),
        ),
      )
      .catch(() => setFailed(true));
  }, []);

  const provinces = lists[PROVINCES_PATH];
  const provinceCode = provinces?.find((p) => p.name === province)?.code;
  const cityList = provinceCode ? citiesPath(provinceCode) : null;

  useEffect(() => {
    if (!cityList) return;
    load(cityList)
      .then((places) =>
        store(cityList)(
          [...places, ...(EXTRA_CITIES[province] ?? [])].sort(byName),
        ),
      )
      .catch(() => setFailed(true));
  }, [cityList, province]);

  const cities = cityList ? lists[cityList] : undefined;
  const cityCode = cities?.find((c) => c.name === city)?.code;
  const barangayList = cityCode ? barangaysPath(cityCode) : null;

  useEffect(() => {
    if (!barangayList) return;
    load(barangayList)
      .then((places) => store(barangayList)([...places].sort(byName)))
      .catch(() => setFailed(true));
  }, [barangayList]);

  const barangays = barangayList ? lists[barangayList] : undefined;

  return {
    failed,
    provinces: namesWith(provinces ?? [], province),
    cities: namesWith(cities ?? [], city),
    barangays: namesWith(barangays ?? [], barangay),
    loadingProvinces: !provinces && !failed,
    loadingCities: Boolean(cityList) && !cities && !failed,
    loadingBarangays: Boolean(barangayList) && !barangays && !failed,
  };
}
