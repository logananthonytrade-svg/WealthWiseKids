import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type SectionType = 'hook' | 'body' | 'realcheck' | 'mathbreak' | 'wywd' | 'reflect';

export interface LessonSection {
  type: SectionType;
  title?: string;
  body: string;
}

interface Props {
  sections: LessonSection[];
}

function HookSection({ body }: { body: string }) {
  return (
    <View style={styles.hook}>
      <Text style={styles.hookText}>{body}</Text>
    </View>
  );
}

function BodySection({ title, body }: { title?: string; body: string }) {
  return (
    <View style={styles.bodySection}>
      {title ? <Text style={styles.sectionHeading}>{title}</Text> : null}
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  );
}

function RealCheckSection({ title, body }: { title?: string; body: string }) {
  return (
    <View style={styles.realcheck}>
      <View style={styles.calloutHeader}>
        <Text style={styles.calloutIcon}>🎯</Text>
        <Text style={[styles.calloutLabel, { color: '#D4820A' }]}>
          {title ?? 'High-School Reality Check'}
        </Text>
      </View>
      <Text style={styles.calloutBody}>{body}</Text>
    </View>
  );
}

function MathBreakSection({ title, body }: { title?: string; body: string }) {
  return (
    <View style={styles.mathbreak}>
      <View style={styles.calloutHeader}>
        <Text style={styles.calloutIcon}>🧮</Text>
        <Text style={[styles.calloutLabel, { color: '#1565C0' }]}>
          {title ?? 'Math Break'}
        </Text>
      </View>
      <Text style={styles.calloutBody}>{body}</Text>
    </View>
  );
}

function WYWDSection({ title, body }: { title?: string; body: string }) {
  return (
    <View style={styles.wywd}>
      <View style={styles.calloutHeader}>
        <Text style={styles.calloutIcon}>💭</Text>
        <Text style={[styles.calloutLabel, { color: '#1B6B3A' }]}>
          {title ?? 'What Would You Do?'}
        </Text>
      </View>
      <Text style={styles.calloutBody}>{body}</Text>
    </View>
  );
}

function ReflectSection({ title, body }: { title?: string; body: string }) {
  return (
    <View style={styles.reflect}>
      <View style={styles.calloutHeader}>
        <Text style={styles.calloutIcon}>📝</Text>
        <Text style={[styles.calloutLabel, { color: '#5B2D8E' }]}>
          {title ?? 'Reflection Prompt'}
        </Text>
      </View>
      <Text style={styles.calloutBody}>{body}</Text>
    </View>
  );
}

export default function RichLessonContent({ sections }: Props) {
  return (
    <View style={styles.container}>
      {sections.map((section, index) => {
        switch (section.type) {
          case 'hook':
            return <HookSection key={index} body={section.body} />;
          case 'realcheck':
            return <RealCheckSection key={index} title={section.title} body={section.body} />;
          case 'mathbreak':
            return <MathBreakSection key={index} title={section.title} body={section.body} />;
          case 'wywd':
            return <WYWDSection key={index} title={section.title} body={section.body} />;
          case 'reflect':
            return <ReflectSection key={index} title={section.title} body={section.body} />;
          case 'body':
          default:
            return <BodySection key={index} title={section.title} body={section.body} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },

  // ── Hook (opening story) ──────────────────────────────────
  hook: {
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1B3A6B',
  },
  hookText: {
    fontSize: 17,
    color: '#1B3A6B',
    lineHeight: 28,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  // ── Body (standard content) ────────────────────────────────
  bodySection: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B3A6B',
    letterSpacing: -0.3,
  },
  bodyText: {
    fontSize: 16,
    color: '#2C2C2C',
    lineHeight: 27,
  },

  // ── Shared callout base ────────────────────────────────────
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  calloutIcon: {
    fontSize: 20,
  },
  calloutLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  calloutBody: {
    fontSize: 15,
    color: '#333',
    lineHeight: 25,
  },

  // ── High-School Reality Check (amber) ─────────────────────
  realcheck: {
    backgroundColor: '#FFFBF0',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#F0A500',
  },

  // ── Math Break (blue) ──────────────────────────────────────
  mathbreak: {
    backgroundColor: '#EEF4FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#90B4E8',
  },

  // ── What Would You Do? (green) ────────────────────────────
  wywd: {
    backgroundColor: '#F0FAF4',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#27AE60',
  },

  // ── Reflection Prompt (purple) ────────────────────────────
  reflect: {
    backgroundColor: '#F8F0FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#9B59B6',
  },
});
