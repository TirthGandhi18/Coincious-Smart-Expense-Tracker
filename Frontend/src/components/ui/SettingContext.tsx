import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../App'; // We need the user ID
import { toast } from 'sonner'; // Optional: for error notifications

interface SettingsContextType {
    dataSharing: boolean;
    setDataSharing: (value: boolean) => void;
    isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
    const { user } = useAuth(); // Get the current user
    const [dataSharing, setDataSharingState] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // 1. Fetch settings from Supabase when the user logs in
    useEffect(() => {
        async function loadSettings() {
            if (!user) {
                setIsLoadingSettings(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('data_sharing_enabled')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 means no row found, which is fine
                    console.error('Error fetching settings:', error);
                }

                if (data) {
                    setDataSharingState(data.data_sharing_enabled);
                } else {
                    // No settings found for this user yet, default to false
                    setDataSharingState(false);
                }
            } catch (err) {
                console.error('Unexpected error loading settings:', err);
            } finally {
                setIsLoadingSettings(false);
            }
        }

        loadSettings();
    }, [user]);

    // 2. Save settings to Supabase when the toggle changes
    const setDataSharing = async (value: boolean) => {
        // Optimistic update (update UI immediately)
        setDataSharingState(value);

        if (!user) return;

        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert(
                    {
                        user_id: user.id,
                        data_sharing_enabled: value,
                        updated_at: new Date().toISOString()
                    },
                    { onConflict: 'user_id' }
                );

            if (error) {
                console.error('Error saving setting:', error);
                toast.error('Failed to save settings');
                // Revert state if it failed
                setDataSharingState(!value);
            }
        } catch (err) {
            console.error('Unexpected error saving settings:', err);
        }
    };

    return (
        <SettingsContext.Provider value={{ dataSharing, setDataSharing, isLoadingSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};