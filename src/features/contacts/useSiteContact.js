import { useEffect, useState } from "react";
import { getSiteContactInfo, mergeSiteContact } from "./siteContacts.js";

export default function useSiteContact(path, fallback = null) {
  const [contact, setContact] = useState(fallback);

  useEffect(() => {
    let active = true;
    setContact(fallback);
    getSiteContactInfo()
      .then((records) => {
        if (active) setContact(mergeSiteContact(path, fallback, records));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [path]);

  return contact;
}
