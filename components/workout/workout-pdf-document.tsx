"use client";

import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { Database } from "@/types/database";
import { displayDistance, displayWeight, distanceUnit, weightUnit, type UnitSystem } from "@/utils/unit-conversion";

type Workout = Database['public']['Tables']['training_sessions']['Row'];
type WorkoutLog = Database['public']['Tables']['strength_sets']['Row'];
type CardioLog = Database['public']['Tables']['cardio_sessions']['Row'];

// 1. Define Styles (CSS-like but for PDF)
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica" },
  header: { borderBottomWidth: 2, borderBottomColor: "#000000", paddingBottom: 10, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "heavy", textTransform: "uppercase", marginBottom: 5 },
  meta: { fontSize: 10, color: "#555555", flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 5, textTransform: "uppercase" },
  
  // Table Styles
  table: { width: "100%", marginTop: 5 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 6, alignItems: 'center' },
  tableHeader: { backgroundColor: "#f9fafb", borderBottomWidth: 0 },
  
  // Cells
  colSet: { width: "15%", fontSize: 10, color: "#6b7280" },
  colMain: { width: "50%", fontSize: 10, fontWeight: "bold" },
  colMetric: { width: "20%", fontSize: 10 },
  colEnd: { width: "15%", fontSize: 10, textAlign: "right" },
  
  footer: { position: "absolute", bottom: 30, left: 30, right: 30, textAlign: "center", fontSize: 8, color: "#9ca3af" },
  badge: { fontSize: 8, backgroundColor: "black", color: "white", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, alignSelf: "flex-end" }
});

interface WorkoutPDFProps {
  workout: Workout & { user?: { email: string } | null };
  strengthLogs: WorkoutLog[];
  cardioLogs: CardioLog[];
  unitSystem?: UnitSystem;
}

// 2. The PDF Component
export const WorkoutPDF = ({ workout, strengthLogs, cardioLogs, unitSystem = "metric" }: WorkoutPDFProps) => {
  const strengthGroups = groupBy(strengthLogs, "exercise_name");
  const cardioGroups = groupBy(cardioLogs, "activity_type");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.title}>{workout.name}</Text>
              <View style={styles.meta}>
                <Text>{format(new Date(workout.date), "PPP")}</Text>
                {workout.overall_rating ? <Text>• Rating: {workout.overall_rating}/10</Text> : null}
                {workout.template_id ? <Text>• Template Linked</Text> : null}
                {workout.user?.email && <Text>• {workout.user.email.split('@')[0]}</Text>}
              </View>
            </View>
            <View>
              <Text style={styles.badge}>FitTrack</Text>
            </View>
          </View>
        </View>

        {/* STRENGTH SECTION */}
        {Object.entries(strengthGroups).map(([name, sets], index) => (
          <View key={index} wrap={false}>
            <Text style={styles.sectionTitle}>{name}</Text>
            
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colSet}>SET</Text>
              <Text style={styles.colMain}>WEIGHT</Text>
              <Text style={styles.colMetric}>REPS</Text>
              <Text style={styles.colEnd}>META</Text>
            </View>

            {/* Table Rows */}
            {sets.map((set, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colSet}>#{set.set_number}</Text>
                <Text style={styles.colMain}>{displayWeight(set.weight, unitSystem)?.toFixed(1)} {weightUnit(unitSystem)}</Text>
                <Text style={styles.colMetric}>{set.reps}</Text>
                <Text style={styles.colEnd}>
                  {[
                    set.is_warmup ? "W" : null,
                    set.is_dropset ? "D" : null,
                    set.rest_seconds ? `R${set.rest_seconds}` : null,
                    set.tempo ? set.tempo : null,
                  ]
                    .filter(Boolean)
                    .join("|") || "-"}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* CARDIO SECTION */}
        {Object.entries(cardioGroups).map(([activity, logs], index) => (
          <View key={`cardio-${index}`} wrap={false}>
            <Text style={styles.sectionTitle}>{activity}</Text>
            
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.colSet}>TIME</Text>
              <Text style={styles.colMain}>DISTANCE</Text>
              <Text style={styles.colMetric}>KCAL</Text>
              <Text style={styles.colEnd}>HR</Text>
            </View>

            {logs.map((log, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colSet}>{log.duration_minutes} min</Text>
                <Text style={styles.colMain}>{log.distance ? `${displayDistance(log.distance, unitSystem)?.toFixed(1)} ${distanceUnit(unitSystem)}` : "-"}</Text>
                <Text style={styles.colMetric}>{log.calories_burned || "-"}</Text>
                <Text style={styles.colEnd}>{log.average_heart_rate || "-"}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* FOOTER */}
        <Text style={styles.footer}>Generated by FitTrack</Text>
      </Page>
    </Document>
  );
};

function groupBy<T extends Record<string, unknown>>(array: T[], key: keyof T) {
  return array.reduce<Record<string, T[]>>((result, currentValue) => {
    const rawKey = currentValue[key];
    const groupKey = typeof rawKey === "string" && rawKey.length > 0 ? rawKey : "Other";
    (result[groupKey] = result[groupKey] || []).push(currentValue);
    return result;
  }, {});
}
