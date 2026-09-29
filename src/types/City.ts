export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

export interface GeocodedCity {
  name: string;
  latitude: number;
  longitude: number;
  detail: string;
}
