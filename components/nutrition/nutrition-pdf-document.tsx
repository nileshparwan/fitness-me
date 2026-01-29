"use client";

import React from "react";
import { Page, Text, View, Document, StyleSheet, Font } from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";

// Register standard font
Font.register({
    family: "Helvetica",
    fonts: [
        { src: "https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf" },
        { src: "https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf", fontWeight: "bold" },
    ],
});

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#333" },
    header: { borderBottomWidth: 2, borderBottomColor: "#22c55e", paddingBottom: 10, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: "bold", textTransform: "uppercase", color: "#000" },
    subTitle: { fontSize: 10, color: "#666", marginTop: 4 },

    // Stats Bar
    statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, backgroundColor: "#f9fafb", padding: 10, borderRadius: 4 },
    statItem: { flexDirection: "column" },
    statLabel: { fontSize: 8, color: "#666", textTransform: "uppercase" },
    statValue: { fontSize: 12, fontWeight: "bold", color: "#000" },

    // Table Layout
    tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 4, marginBottom: 4 },
    
    // Meal Row Container (Wraps Main Info + Instructions)
    mealWrapper: { 
        flexDirection: "column", 
        borderBottomWidth: 0.5, 
        borderBottomColor: "#eee", 
        paddingVertical: 8,
        minHeight: 30 
    },
    
    // Top Row: Type | Food | Macros
    mainInfoRow: { flexDirection: "row", width: "100%" },

    // Bottom Row: Instructions
    instructionsRow: { 
        marginTop: 6, 
        paddingLeft: "20%", // Indent to align with Food Name (skipping Type column)
        paddingRight: 10
    },

    // Column Widths (Adjusted since Notes column is gone)
    colType: { width: "20%", fontSize: 8, fontWeight: "bold", textTransform: "uppercase" },
    colFood: { width: "60%" }, // Expanded width
    colMacros: { width: "20%", textAlign: "right", fontSize: 9 },

    // Text Styles
    bold: { fontWeight: "bold" },
    instructionText: { fontSize: 9, color: "#555", lineHeight: 1.4 },
    altText: { fontSize: 9, color: "#666", fontStyle: "italic", marginTop: 2 },
    
    // Labels
    label: { fontSize: 8, color: "#888", fontWeight: "bold", marginBottom: 2 }
});

export const NutritionPDF = ({ program, meals }: { program: any; meals: any[] }) => {
    if (!program || !meals) return <Document><Page><Text>No Data</Text></Page></Document>;

    const totals = meals.reduce((acc, m) => ({
        cals: acc.cals + (m.calories || 0),
        prot: acc.prot + (m.protein_g || 0),
        carbs: acc.carbs + (m.carbs_g || 0),
        fats: acc.fats + (m.fats_g || 0),
    }), { cals: 0, prot: 0, carbs: 0, fats: 0 });

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{program.name || "Untitled Plan"}</Text>
                    <Text style={styles.subTitle}>
                        {program.start_date ? format(parseISO(program.start_date), "MMM d, yyyy") : ""} -
                        {program.end_date ? format(parseISO(program.end_date), "MMM d, yyyy") : ""}
                    </Text>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Items</Text>
                        <Text style={styles.statValue}>{meals.length}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Calories</Text>
                        <Text style={styles.statValue}>{totals.cals}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Protein</Text>
                        <Text style={styles.statValue}>{totals.prot}g</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Carbs</Text>
                        <Text style={styles.statValue}>{totals.carbs}g</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Fats</Text>
                        <Text style={styles.statValue}>{totals.fats}g</Text>
                    </View>
                </View>

                {/* Program Notes */}
                {program.notes ? (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.statLabel, { marginBottom: 4 }]}>Program Notes</Text>
                        <View style={{ padding: 8, backgroundColor: "#f3f4f6", borderRadius: 4 }}>
                            <Text>{program.notes}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={styles.colType}>Type</Text>
                    <Text style={styles.colFood}>Food Item</Text>
                    <Text style={styles.colMacros}>Macros</Text>
                </View>

                {/* Meals List */}
                {meals.map((meal, index) => (
                    <View key={meal.id || index} style={styles.mealWrapper} wrap={false}>
                        
                        {/* 1. Main Info Row */}
                        <View style={styles.mainInfoRow}>
                            <Text style={styles.colType}>
                                {(meal.meal_type || "").replace(/_/g, " ")}
                            </Text>

                            <View style={styles.colFood}>
                                <Text style={styles.bold}>{meal.food_name || "Unknown Food"}</Text>
                                <Text style={{ fontSize: 8, color: "#888", marginTop: 2 }}>
                                    {meal.calories || 0} kcal
                                </Text>
                            </View>

                            <Text style={styles.colMacros}>
                                {`${meal.protein_g || 0}p ${meal.carbs_g || 0}c ${meal.fats_g || 0}f`}
                            </Text>
                        </View>

                        {/* 2. Instructions / Alternatives Row (Conditionally Rendered) */}
                        {(meal.instructions || meal.alternatives) && (
                            <View style={styles.instructionsRow}>
                                {meal.instructions && (
                                    <View style={{ marginBottom: 4 }}>
                                        <Text style={styles.label}>PREPARATION:</Text>
                                        <Text style={styles.instructionText}>{meal.instructions}</Text>
                                    </View>
                                )}
                                {meal.alternatives && (
                                    <View>
                                        <Text style={styles.label}>ALTERNATIVES:</Text>
                                        <Text style={styles.altText}>{meal.alternatives}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                ))}

            </Page>
        </Document>
    );
};