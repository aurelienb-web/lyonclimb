import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const CROWD_LEVELS = [
  { level: 1, label: 'Très calme', color: '#27ae60' },
  { level: 2, label: 'Peu fréquenté', color: '#2ecc71' },
  { level: 3, label: 'Modéré', color: '#f39c12' },
  { level: 4, label: 'Fréquenté', color: '#e67e22' },
  { level: 5, label: 'Très fréquenté', color: '#e74c3c' },
];

const CrowdChart = ({ plannedVisits, openingHours, date }) => {
  const [selectedBar, setSelectedBar] = useState(null);
  const scrollRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);

  if (!openingHours) return null;

  const targetDateStr = date || new Date().toISOString().split('T')[0];
  const isToday = targetDateStr === new Date().toISOString().split('T')[0];

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = new Date(targetDateStr).getDay();
  const dayKey = days[dayIndex];
  const hoursString = openingHours[dayKey];

  if (!hoursString || hoursString === 'Fermé') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>La salle est fermée ce jour-là.</Text>
      </View>
    );
  }

  const [openStr, closeStr] = hoursString.split('-');
  const toMins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const openMins = toMins(openStr);
  const closeMins = toMins(closeStr);

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Generate 30-min slots
  const slots = [];
  for (let mins = openMins; mins < closeMins; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    // Count overlapping visits
    const overlapping = plannedVisits.filter(v => {
      const vStart = toMins(v.arrivalTime);
      const vEnd = vStart + v.duration;
      return mins < vEnd && vStart < mins + 30;
    });

    const isPast = isToday && (mins + 30 <= nowMins);

    const count = overlapping.length;
    let level = 1;
    if (count >= 20) level = 5;
    else if (count >= 15) level = 4;
    else if (count >= 10) level = 3;
    else if (count >= 5) level = 2;

    slots.push({
      time: timeStr,
      count,
      level,
      color: isPast ? '#adb5bd' : CROWD_LEVELS.find(cl => cl.level === level).color,
      isPast
    });
  }

  const handleScrollStep = (direction) => {
    if (scrollRef.current) {
      // Un bâton fait 14px + 6px de marge = 20px. 6 bâtons = 120px.
      const step = 120;
      const newX = direction === 'right' ? scrollX + step : scrollX - step;
      scrollRef.current.scrollTo({ x: Math.max(0, newX), animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <TouchableOpacity style={styles.arrowButton} onPress={() => handleScrollStep('left')}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        <ScrollView 
          ref={scrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.scroll}
          onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
        >
          <View style={styles.chartArea}>
            {slots.map((slot, index) => {
              const isSelected = selectedBar === index;
              // Hauteur amortie comme demandé : base 45px + 8px par niveau
              const height = 45 + (slot.level * 8);

              return (
                <View key={index} style={styles.barWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSelectedBar(isSelected ? null : index)}
                    onMouseEnter={() => setSelectedBar(index)}
                    onMouseLeave={() => setSelectedBar(null)}
                    style={[
                      styles.bar,
                      {
                        height: height,
                        backgroundColor: slot.color,
                        opacity: isSelected ? 1 : 0.7,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: '#1a2332',
                        overflow: 'hidden', // Pour les hachures
                      }
                    ]}
                  >
                    {slot.isPast && (
                      <View style={StyleSheet.absoluteFill}>
                        {[...Array(15)].map((_, i) => (
                          <View
                            key={i}
                            style={{
                              position: 'absolute',
                              width: 30,
                              height: 1.5,
                              backgroundColor: '#868e96',
                              top: i * 10 - 20,
                              left: -5,
                              transform: [{ rotate: '45deg' }],
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                  {(index % 2 === 0 || isSelected) && (
                    <Text style={[
                      styles.timeText, 
                      isSelected && styles.timeTextSelected,
                      (index % 2 !== 0 && isSelected) && { bottom: -35 }
                    ]}>
                      {slot.time}
                    </Text>
                  )}
                  
                  {isSelected && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>{slot.count} pers.</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.arrowButton} onPress={() => handleScrollStep('right')}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10, // Réduit
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8, // Réduit
    borderWidth: 1,
    borderColor: '#eee',
    paddingBottom: 30, // Pour les labels décalés
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 30,
    color: '#bdc3c7',
    fontWeight: '300',
  },
  scroll: {
    flex: 1,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 145, // Augmenté pour barres plus grandes + tooltips
    paddingBottom: 25,
    paddingHorizontal: 10,
  },
  barWrapper: {
    alignItems: 'center',
    marginHorizontal: 3,
    position: 'relative',
  },
  bar: {
    width: 14,
    borderRadius: 10,
  },
  timeText: {
    position: 'absolute',
    bottom: -22,
    fontSize: 10,
    color: '#7f8c8d',
    width: 40,
    textAlign: 'center',
  },
  timeTextSelected: {
    color: '#1a2332',
    fontWeight: '800',
    zIndex: 10,
  },
  tooltip: {
    position: 'absolute',
    top: -25,
    backgroundColor: '#1a2332',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 45,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 14,
  }
});

export default CrowdChart;
