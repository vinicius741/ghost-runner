import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Save, RefreshCw, Navigation } from 'lucide-react';

interface GeolocationSettings {
    latitude: number;
    longitude: number;
}

interface Settings {
    geolocation: GeolocationSettings;
}

export function SettingsManager() {
    const [settings, setSettings] = useState<Settings>({
        geolocation: { latitude: -23.55052, longitude: -46.633308 }
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detecting, setDetecting] = useState(false);

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
        } catch (e) {
            console.error('Error saving settings:', e);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateGeo = (field: keyof GeolocationSettings, value: string | number) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        setSettings(prev => ({
            ...prev,
            geolocation: {
                ...prev.geolocation,
                [field]: isNaN(numValue) ? 0 : numValue
            }
        }));
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setDetecting(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setSettings(prev => ({
                    ...prev,
                    geolocation: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }
                }));
                setDetecting(false);
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
        <Card className="bg-slate-900/50 backdrop-blur border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-slate-100 font-normal flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    Geolocation Settings
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchSettings}
                    disabled={loading}
                    className="text-slate-400 hover:text-slate-100"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="latitude" className="text-slate-400">Latitude</Label>
                        <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={settings.geolocation.latitude}
                            onChange={(e) => updateGeo('latitude', e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-100"
                            placeholder="-23.55052"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="longitude" className="text-slate-400">Longitude</Label>
                        <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={settings.geolocation.longitude}
                            onChange={(e) => updateGeo('longitude', e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-100"
                            placeholder="-46.633308"
                        />
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGetCurrentLocation}
                        disabled={detecting}
                        className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 hover:text-blue-300 gap-2"
                    >
                        <Navigation className={`w-4 h-4 ${detecting ? 'animate-pulse' : ''}`} />
                        {detecting ? 'Detecting Location...' : 'Use Current Location'}
                    </Button>
                </div>

                <div className="pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-sky-400 hover:opacity-90 transition-all"
                    >
                        {saving ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Configuration
                    </Button>
                    <p className="text-xs text-slate-500 mt-4 text-center">
                        Note: Changes will apply to new browser instances.
                        Persistent profiles will be updated on the next launch.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
