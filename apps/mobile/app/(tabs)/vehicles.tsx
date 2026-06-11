import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { api } from '@/api/client';
import { EmptyState, FAB, GradientHeader, Screen, TextField, VehicleCard } from '@/components';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/theme/ThemeProvider';

export default function VehiclesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data, loading, reload } = useAsync(() => api.listVehicles(), []);
  const [query, setQuery] = useState('');

  const filtered = (data ?? []).filter((v) =>
    [v.registration_number, v.make, v.model].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <Screen
        noPadding
        scrollProps={{ refreshControl: <RefreshControl refreshing={false} onRefresh={() => reload(true)} tintColor={theme.colors.primary} /> }}
      >
        <GradientHeader title="Vehicles" subtitle="Tap a vehicle to manage its loads." />

        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: 120 }}>
          <View style={{ marginBottom: theme.spacing.md }}>
            <TextField value={query} onChangeText={setQuery} placeholder="Search vehicles..." icon="search" autoCapitalize="characters" />
          </View>

          {!loading && filtered.length === 0 ? (
            <EmptyState
              icon="bus"
              title={query ? 'No matches' : 'No vehicles yet'}
              subtitle={query ? 'Try a different search.' : 'Enroll your first lorry or container to start tracking loads and profit.'}
              actionLabel={query ? undefined : 'Add Vehicle'}
              onAction={query ? undefined : () => router.push('/vehicle/new')}
            />
          ) : (
            filtered.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} onPress={() => router.push(`/vehicle/${v.id}`)} />
            ))
          )}
        </View>
      </Screen>
      <FAB onPress={() => router.push('/vehicle/new')} label="Add" />
    </>
  );
}
