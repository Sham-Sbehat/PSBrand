import { useState, useEffect, useCallback } from "react";
import { shipmentsService } from "../services/api";

/**
 * Hook مشترك لتحميل المدن والمناطق - يقلل التكرار في EmployeeDashboard، DesignManagerDashboard، إلخ
 * يحمّل المناطق بشكل متوازي (أسرع من التسلسل)
 */
export const useCitiesAndAreas = () => {
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const citiesData = await shipmentsService.getCities();
      const citiesArray = Array.isArray(citiesData) ? citiesData : [];
      setCities(citiesArray);

      const cityIds = citiesArray
        .filter((c) => c && (c.id || c.Id))
        .map((c) => c.id || c.Id);

      const areaResults = await Promise.allSettled(
        cityIds.map((cityId) => shipmentsService.getAreas(cityId))
      );

      const allAreas = [];
      areaResults.forEach((result, idx) => {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          const cityId = cityIds[idx];
          result.value.forEach((area) => {
            if (area) {
              allAreas.push({
                ...area,
                id: area.id || area.Id || area.areaId,
                name: area.name || area.Name || area.areaName,
                cityId,
              });
            }
          });
        }
      });
      setAreas(allAreas);
    } catch (err) {
      setError(err);
      setCities([]);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { cities, areas, loading, error, reload: load };
};
