import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Save, RefreshCw, Navigation, Globe, Lock as LockIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMap, MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
}

interface GeolocationSettings {
    latitude: number;
    longitude: number;
}

interface Settings {
    geolocation: GeolocationSettings;
}

interface SettingsManagerProps {
    onSettingsSaved?: () => void;
}

export function SettingsManager({ onSettingsSaved }: SettingsManagerProps) {
    const [settings, setSettings] = useState<Settings>({
        geolocation: { latitude: -23.55052, longitude: -46.633308 }
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [settingUpLogin, setSettingUpLogin] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.settings && data.settings.geolocation) {
                setSettings(data.settings);
            }
        } catch (e) {
            console.error('Error fetching settings:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            onSettingsSaved?.();
        } catch (e) {
            console.error('Error saving settings:', e);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSetupLogin = async () => {
        setSettingUpLogin(true);
        try {
            const res = await fetch('/api/setup-login', { method: 'POST' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            alert(data.message);
        } catch (e: any) {
            console.error('Error starting setup login:', e);
            alert(`Failed to start setup login: ${e.message}`);
        } finally {
            setSettingUpLogin(false);
        }
    };

    const updateGeo = (field: keyof GeolocationSettings, value: string | number) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        setSettings((prev: Settings) => ({
            ...prev,
            geolocation: {
                ...prev.geolocation,
                [field]: isNaN(numValue) ? 0 : numValue
            }
        }));
    };

    const handleGetCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setDetecting(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const newSettings: Settings = {
                    geolocation: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }
                };
                setSettings(newSettings);
                setDetecting(false);

                // Automatically save the detected location
                setSaving(true);
                try {
                    const res = await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ settings: newSettings })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    onSettingsSaved?.();
                } catch (e) {
                    console.error('Error saving location:', e);
                    alert('Failed to save location');
                } finally {
                    setSaving(false);
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                alert(`Error getting location: ${error.message}`);
                setDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <Card className="card-premium h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        Geolocation Settings
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchSettings}
                        disabled={loading}
                        className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="latitude" className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={settings.geolocation.latitude}
                                    onChange={(e) => updateGeo('latitude', e.target.value)}
                                    className="h-10 bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                    placeholder="-23.55052"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="longitude" className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={settings.geolocation.longitude}
                                    onChange={(e) => updateGeo('longitude', e.target.value)}
                                    className="h-10 bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                    placeholder="-46.633308"
                                />
                            </div>
                        </div>

                        <div className="flex justify-center pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleGetCurrentLocation}
                                disabled={detecting || saving}
                                className="h-9 px-4 bg-blue-500/5 text-blue-400 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-300 transition-all duration-300 gap-2"
                            >
                                <Navigation className={`w-3.5 h-3.5 ${detecting || saving ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    {detecting ? 'Detecting...' : saving ? 'Saving...' : 'Use Current Location'}
                                </span>
                            </Button>
                        </div>

                        <div className="mt-2 h-[200px] rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group relative">
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-300">
                                <Globe className="w-12 h-12 text-blue-500" />
                            </div>
                            <MapContainer
                                center={[settings.geolocation.latitude, settings.geolocation.longitude]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={false}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[settings.geolocation.latitude, settings.geolocation.longitude]} />
                                <RecenterMap lat={settings.geolocation.latitude} lng={settings.geolocation.longitude} />
                                <MapEvents onChange={(lat, lng) => {
                                    setSettings((prev: Settings) => ({
                                        ...prev,
                                        geolocation: { latitude: lat, longitude: lng }
                                    }));
                                }} />
                            </MapContainer>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                        <div className="flex items-center gap-2 mb-2">
                            <LockIcon className="w-4 h-4 text-amber-500" />
                            <h3 className="text-slate-100 font-medium tracking-tight">Authentication</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Session Management</p>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <Button
                                onClick={handleSetupLogin}
                                disabled={settingUpLogin || loading}
                                className="relative w-full h-11 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-100 transition-all duration-300"
                            >
                                {settingUpLogin ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-amber-500" />
                                ) : (
                                    <LockIcon className="w-4 h-4 mr-2 text-amber-500" />
                                )}
                                <span className="font-semibold tracking-wide">Setup Google Login</span>
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            This will launch a browser for manual login.
                            The session will be saved for all automation tasks.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-sky-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <Button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="relative w-full h-11 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-100 transition-all duration-300"
                            >
                                {saving ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-500" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2 text-blue-500" />
                                )}
                                <span className="font-semibold tracking-wide">Save Configuration</span>
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-500 text-center leading-relaxed px-4">
                            Changes apply to new browser instances.
                            <br />
                            Profiles update on next launch.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
