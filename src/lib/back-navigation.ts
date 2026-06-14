type SearchParamsReader = {
  get(name: string): string | null;
};

function getOperation(searchParams: SearchParamsReader) {
  const operation = searchParams.get("operation");
  return operation === "rent" || operation === "sell" ? operation : "";
}

function getCity(searchParams: SearchParamsReader) {
  return searchParams.get("city")?.trim() ?? "";
}

function unitCategoryPath(operation: string, city: string) {
  return `/unit-category?operation=${operation}&city=${city}`;
}

function propertiesPath(mode: "full" | "partial") {
  return mode === "partial" ? "/partial-units" : "/properties";
}

export function getBackDestination(pathname: string, searchParams: SearchParamsReader) {
  const operation = getOperation(searchParams);
  const rawCity = getCity(searchParams);
  const city = encodeURIComponent(rawCity);

  if (pathname === "/properties/new") return "/properties";
  if (pathname === "/partial-units/new") return "/partial-units";
  if (pathname === "/customers/new") return "/customers";

  if (/^\/properties\/[^/]+\/edit$/.test(pathname)) return propertiesPath("full");
  if (/^\/partial-units\/[^/]+\/edit$/.test(pathname)) return propertiesPath("partial");
  if (/^\/customers\/[^/]+\/edit$/.test(pathname)) return "/customers";

  if ((pathname === "/properties" || pathname === "/partial-units") && operation && city) {
    return unitCategoryPath(operation, city);
  }

  if (pathname === "/unit-category" && operation) {
    return `/cities?operation=${operation}`;
  }

  if (pathname === "/cities") {
    return "/choose-operation";
  }

  if (
    pathname === "/properties" ||
    pathname === "/partial-units" ||
    pathname === "/customers" ||
    pathname === "/archive" ||
    pathname === "/customers/archive" ||
    pathname === "/admin"
  ) {
    return "/choose-operation";
  }

  if (pathname === "/admin/employees" || pathname === "/admin/permissions" || pathname === "/admin/backup") {
    return "/admin";
  }

  return "/choose-operation";
}
