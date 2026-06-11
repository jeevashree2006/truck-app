import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { Button, GradientHeader, Screen, SectionCard, SelectField, TextField } from '@/components';
import type { SelectOption } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import type { AxleType, BodyType, VehicleInput } from '@/types';
import { AXLE_TYPES, BODY_TYPES, COMMON_LENGTHS_FEET, axleLabels, bodyLabels } from '@/utils/domain';

const AXLE_OPTS: SelectOption<AxleType>[] = AXLE_TYPES.map((a) => ({ value: a, label: axleLabels[a] }));
const BODY_OPTS: SelectOption<BodyType>[] = BODY_TYPES.map((b) => ({ value: b, label: bodyLabels[b] }));
const FEET_OPTS: SelectOption<string>[] = COMMON_LENGTHS_FEET.map((f) => ({ value: String(f), label: `${f} ft` }));

export default function NewVehicleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [reg, setReg] = useState('');
  const [axle, setAxle] = useState<AxleType>('multi');
  const [feet, setFeet] = useState('32');
  const [body, setBody] = useState<BodyType>('container');
  const [age, setAge] = useState('');
  const [chassis, setChassis] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reg.trim()) return;
    setSaving(true);
    try {
      const input: VehicleInput = {
        registration_number: reg.trim().toUpperCase(),
        axle_type: axle,
        length_feet: feet ? Number(feet) : null,
        body_type: body,
        age_years: age ? Number(age) : null,
        chassis_number: chassis.trim() || null,
        make: make.trim() || null,
        model: model.trim() || null,
        documents: {},
      };
      await api.createVehicle(input);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen noPadding>
      <GradientHeader title="Add Vehicle" compact onBack={() => router.back()} />
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: 40 }}>
        <SectionCard title="Vehicle details" style={{ gap: 14 }}>
          <TextField label="Vehicle number" value={reg} onChangeText={setReg} placeholder="TN28AB1234" autoCapitalize="characters" icon="bus" />
          <SelectField<AxleType> label="Axle" value={axle} options={AXLE_OPTS} onChange={setAxle} />
          <SelectField<string> label="Length (feet)" value={feet} options={FEET_OPTS} onChange={setFeet} />
          <SelectField<BodyType> label="Body type" value={body} options={BODY_OPTS} onChange={setBody} />
          <TextField label="Vehicle age (years)" value={age} onChangeText={setAge} placeholder="3" keyboardType="number-pad" optional />
          <TextField label="Chassis number" value={chassis} onChangeText={setChassis} placeholder="MAT4827…" optional />
          <TextField label="Make" value={make} onChangeText={setMake} placeholder="Tata" optional />
          <TextField label="Model" value={model} onChangeText={setModel} placeholder="LPT 3118" optional />
        </SectionCard>

        <View style={{ height: 18 }} />
        <Button title={saving ? 'Saving…' : 'Add vehicle'} onPress={save} loading={saving} disabled={!reg.trim()} icon="checkmark" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
