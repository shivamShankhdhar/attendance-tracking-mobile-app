import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Path,
  Circle,
  G,
  Line,
  Ellipse,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

/**
 * 1. Office Doorway Illustration (Image 1):
 * Open doorway with red frame, "Workly" hung sign on door, office interior with desk & chair,
 * potted plants, envelope on floor with soft blush shadow.
 */
export function OfficeDoorwayIllustration({
  width = 280,
  height = 200,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <View style={styles.center}>
      <Svg width={width} height={height} viewBox="0 0 280 200" fill="none">
        {/* Soft background blush floor & backdrop */}
        <Ellipse cx="140" cy="180" rx="130" ry="24" fill="#EDF3DF" opacity={0.8} />
        <Ellipse cx="140" cy="110" rx="90" ry="70" fill="#FFF2F1" opacity={0.6} />

        {/* Office Background Interior (visible through open door) */}
        <G transform="translate(100, 40)">
          {/* Back wall & window hint */}
          <Rect x="0" y="0" width="70" height="120" fill="#FAF5F3" />
          <Line x1="0" y1="40" x2="70" y2="40" stroke="#F0E3E1" strokeWidth="1" />
          <Line x1="35" y1="0" x2="35" y2="40" stroke="#F0E3E1" strokeWidth="1" />

          {/* Ceiling hanging lamp */}
          <Line x1="32" y1="0" x2="32" y2="28" stroke="#8C4A52" strokeWidth="1.5" />
          <Path d="M26 28L38 28L42 36L22 36Z" fill="#6C7D38" opacity={0.8} />

          {/* Interior Office Desk */}
          <Rect x="8" y="76" width="54" height="6" rx="2" fill="#DFD0CE" />
          <Line x1="14" y1="82" x2="14" y2="114" stroke="#8C4A52" strokeWidth="2" />
          <Line x1="56" y1="82" x2="56" y2="114" stroke="#8C4A52" strokeWidth="2" />

          {/* Interior Office Chair */}
          <Rect x="26" y="60" width="18" height="22" rx="4" fill="#5B692D" opacity={0.4} />
          <Line x1="35" y1="82" x2="35" y2="100" stroke="#5B692D" strokeWidth="2.5" />
          <Path d="M28 100L42 100" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        </G>

        {/* Door Frame (Olive #5B692D) */}
        <Rect
          x="90"
          y="32"
          width="92"
          height="136"
          stroke="#5B692D"
          strokeWidth="6"
          fill="none"
          rx="2"
        />

        {/* Left Potted Plant (Multi-leaf ficus in clay pot) */}
        <G transform="translate(44, 76)">
          {/* Leaves */}
          <Path
            d="M32 60 C20 40 8 46 4 28 C2 18 14 16 22 28 C26 34 30 46 32 60Z"
            fill="#5B692D"
            opacity={0.85}
          />
          <Path
            d="M32 60 C26 38 18 18 30 6 C38 0 44 8 40 22 C37 32 35 46 32 60Z"
            fill="#6B7B36"
          />
          <Path
            d="M32 60 C38 42 50 36 58 20 C64 12 70 20 62 30 C56 38 42 50 32 60Z"
            fill="#8C9C58"
          />
          {/* Pot */}
          <Path d="M22 62 L42 62 L39 88 L25 88 Z" fill="#6B7B36" />
          <Rect x="20" y="60" width="24" height="4" rx="2" fill="#5B692D" />
        </G>

        {/* Open Door swung inside to the right */}
        <G transform="translate(148, 36)">
          <Polygon
            points="0,0 36,12 36,128 0,132"
            fill="#6B7B36"
            stroke="#5B692D"
            strokeWidth="3"
          />
          {/* Inset panels on the open door */}
          <Polygon points="6,12 30,20 30,64 6,66" fill="#5B692D" opacity={0.3} />
          <Polygon points="6,74 30,76 30,118 6,122" fill="#5B692D" opacity={0.3} />

          {/* Door Handle */}
          <Circle cx="8" cy="70" r="3" fill="#FFFFFF" />
        </G>

        {/* Hanging "Open" sign on the front glass door opening */}
        <G transform="translate(98, 48)">
          <Line x1="16" y1="2" x2="16" y2="12" stroke="#5B692D" strokeWidth="1.5" />
          <Line x1="42" y1="2" x2="42" y2="12" stroke="#5B692D" strokeWidth="1.5" />
          <Rect x="10" y="10" width="38" height="20" rx="3" fill="#5B692D" />
          <SvgText
            x="29"
            y="24"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Open
          </SvgText>
        </G>

        {/* Shrub / foliage on right */}
        <G transform="translate(196, 96)">
          <Circle cx="20" cy="30" r="18" fill="#EDF3DF" />
          <Circle cx="26" cy="22" r="14" fill="#D2DEC0" opacity={0.7} />
          <Circle cx="14" cy="34" r="10" fill="#6B7B36" opacity={0.8} />
          <Circle cx="32" cy="40" r="8" fill="#5B692D" opacity={0.9} />
        </G>

        {/* Mail Envelope resting on the floor in front */}
        <G transform="translate(186, 128)">
          <Rect
            x="0"
            y="0"
            width="64"
            height="44"
            rx="4"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
            transform="rotate(-8)"
          />
          <Path
            d="M2 2 L32 24 L62 2"
            stroke="#5B692D"
            strokeWidth="2"
            fill="none"
            transform="rotate(-8)"
          />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 2. Woman Thinking Next to Storefront (Image 2 Screen 1):
 * Woman with question bubble thinking + store building silhouette on blush blob.
 */
export function WomanThinkingStoreIllustration({
  width = 160,
  height = 110,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <View style={styles.center}>
      <Svg width={width} height={height} viewBox="0 0 160 110" fill="none">
        {/* Soft blush blob */}
        <Ellipse cx="80" cy="65" rx="68" ry="38" fill="#EDF3DF" />

        {/* Store silhouette in the background */}
        <G transform="translate(85, 32)">
          <Rect x="4" y="16" width="46" height="34" rx="2" fill="#FFFFFF" opacity={0.9} />
          <Path d="M0 16L6 6H48L54 16H0Z" fill="#8D9F56" opacity={0.8} />
          <Rect x="12" y="24" width="14" height="14" rx="2" fill="#EDF3DF" />
          <Rect x="30" y="24" width="14" height="26" rx="2" fill="#6C7D38" opacity={0.7} />
        </G>

        {/* Woman thinking character */}
        <G transform="translate(30, 24)">
          {/* Hair back */}
          <Ellipse cx="30" cy="24" rx="15" ry="17" fill="#2C3615" />
          {/* Head & face */}
          <Circle cx="30" cy="25" r="10" fill="#F9D2BA" />
          {/* Hair front strands */}
          <Path d="M20 20 Q30 14 38 20 Q38 28 26 28 Z" fill="#2C3615" />
          {/* Hand to chin */}
          <Path d="M26 32 Q28 28 32 30" stroke="#F9D2BA" strokeWidth="3" strokeLinecap="round" />
          {/* Shoulders / Top */}
          <Path d="M15 54 C15 42 22 36 30 36 C38 36 45 42 45 54 Z" fill="#5B692D" />
        </G>

        {/* Question mark thought bubble */}
        <G transform="translate(94, 16)">
          <Circle cx="12" cy="12" r="11" fill="#5B692D" />
          <SvgText
            x="12"
            y="17"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
          >
            ?
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/**
 * 3. Store in Envelope (Image 2 Screen 2):
 * "You're invited to join Sharma General Store"
 * Open envelope with store building popping out and sparkles.
 */
export function StoreEnvelopeIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        {/* Soft blush background blob */}
        <Circle cx="60" cy="62" r="48" fill="#EDF3DF" />

        {/* Sparkle lines */}
        <Path d="M26 36L32 38" stroke="#6C7D38" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M94 36L88 38" stroke="#6C7D38" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M60 14L60 22" stroke="#6C7D38" strokeWidth="2.5" strokeLinecap="round" />

        {/* Storefront popping out of the open envelope */}
        <G transform="translate(38, 26)">
          <Rect x="4" y="16" width="36" height="30" rx="3" fill="#FFFFFF" stroke="#5B692D" strokeWidth="2" />
          {/* Awning */}
          <Path d="M0 16L4 8H40L44 16H0Z" fill="#5B692D" />
          <Line x1="11" y1="8" x2="11" y2="16" stroke="#FFFFFF" strokeWidth="1.5" />
          <Line x1="22" y1="8" x2="22" y2="16" stroke="#FFFFFF" strokeWidth="1.5" />
          <Line x1="33" y1="8" x2="33" y2="16" stroke="#FFFFFF" strokeWidth="1.5" />
          {/* Doorway */}
          <Rect x="16" y="24" width="12" height="22" rx="2" fill="#5B692D" />
        </G>

        {/* Open Envelope */}
        <G transform="translate(22, 46)">
          {/* Envelope Body */}
          <Path
            d="M6 24 L38 48 L70 24 V64 C70 68 66 72 62 72 H14 C10 72 6 68 6 64 Z"
            fill="#6C7D38"
          />
          <Path
            d="M6 24 L38 48 L70 24"
            stroke="#5B692D"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 4. Account Mismatch Illustration (Image 2 Screen 3):
 * "You're using the wrong Google account"
 * Two avatar circles with swap arrows and red exclamation badge.
 */
export function AccountMismatchIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        {/* Soft blush background blob */}
        <Circle cx="60" cy="60" r="48" fill="#EDF3DF" />

        {/* Left Avatar (Target / Grey) */}
        <G transform="translate(30, 24)">
          <Circle cx="18" cy="18" r="16" fill="#FFFFFF" stroke="#C9C2BE" strokeWidth="2" />
          <Circle cx="18" cy="14" r="6" fill="#A89F9A" />
          <Path d="M9 28 C9 23 13 21 18 21 C23 21 27 23 27 28" fill="#A89F9A" />
        </G>

        {/* Right Avatar (Current / Burgundy) */}
        <G transform="translate(62, 40)">
          <Circle cx="18" cy="18" r="16" fill="#FFFFFF" stroke="#5B692D" strokeWidth="2" />
          <Circle cx="18" cy="14" r="6" fill="#5B692D" />
          <Path d="M9 28 C9 23 13 21 18 21 C23 21 27 23 27 28" fill="#5B692D" />
        </G>

        {/* Swap curved arrows */}
        <Path
          d="M58 32 C68 28 78 30 84 36"
          stroke="#5B692D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Polygon points="84,33 87,38 82,39" fill="#5B692D" />

        <Path
          d="M62 76 C52 80 42 78 36 72"
          stroke="#5B692D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Polygon points="36,75 33,70 38,69" fill="#5B692D" />

        {/* Red Exclamation Badge */}
        <Circle cx="60" cy="74" r="10" fill="#5B692D" />
        <SvgText
          x="60"
          y="78"
          fill="#FFFFFF"
          fontSize="13"
          fontWeight="bold"
          textAnchor="middle"
        >
          !
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * 5. Expired Invite Document Illustration (Image 2 Screen 4):
 * "Invitation expired"
 * Document with shop silhouette and red exclamation badge.
 */
export function ExpiredInviteDocIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <Circle cx="60" cy="62" r="48" fill="#EDF3DF" />

        {/* Document paper with folded corner */}
        <G transform="translate(32, 22)">
          <Path
            d="M6 4 H38 L54 20 V68 C54 72 50 76 46 76 H6 C2 76 0 72 0 68 V10 C0 6 2 4 6 4 Z"
            fill="#FFFFFF"
            stroke="#EAE5E2"
            strokeWidth="2"
          />
          <Path d="M38 4 V20 H54" fill="#FCE9E7" stroke="#EAE5E2" strokeWidth="2" />

          {/* Store front icon on the document */}
          <G transform="translate(14, 30)">
            <Path d="M0 8 L3 2 H23 L26 8 H0 Z" fill="#5B692D" />
            <Rect x="3" y="8" width="20" height="18" fill="#FFFFFF" stroke="#5B692D" strokeWidth="1.5" />
            <Rect x="9" y="14" width="8" height="12" fill="#5B692D" />
          </G>
        </G>

        {/* Red Exclamation Badge */}
        <Circle cx="82" cy="74" r="14" fill="#5B692D" />
        <SvgText
          x="82"
          y="79"
          fill="#FFFFFF"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
        >
          !
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * 6. ID Badge & Padlock Illustration (Image 2 Screen 5):
 * "Sign in with your employee details"
 * ID badge card with photo, red padlock, soft blush cloud.
 */
export function IdBadgeLockIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <Circle cx="60" cy="60" r="48" fill="#EDF3DF" />

        {/* ID Badge Card */}
        <G transform="translate(34, 18)">
          {/* Lanyard loop slot */}
          <Rect x="16" y="0" width="20" height="6" rx="3" fill="#5B692D" opacity={0.6} />

          {/* Badge body */}
          <Rect
            x="4"
            y="8"
            width="44"
            height="62"
            rx="6"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />

          {/* Badge photo avatar */}
          <Circle cx="26" cy="28" r="10" fill="#5B692D" opacity={0.8} />
          <Path d="M14 44 C14 36 19 33 26 33 C33 33 38 36 38 44" fill="#5B692D" opacity={0.8} />

          {/* Info lines on badge */}
          <Line x1="12" y1="52" x2="40" y2="52" stroke="#DFD0CE" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="16" y1="58" x2="36" y2="58" stroke="#DFD0CE" strokeWidth="2.5" strokeLinecap="round" />
        </G>

        {/* Red Padlock badge */}
        <G transform="translate(68, 56)">
          {/* Shackle */}
          <Path
            d="M8 12 V6 C8 2.7 10.7 0 14 0 C17.3 0 20 2.7 20 6 V12"
            stroke="#5B692D"
            strokeWidth="3"
            fill="none"
          />
          {/* Body */}
          <Rect x="2" y="10" width="24" height="20" rx="4" fill="#5B692D" />
          {/* Keyhole */}
          <Circle cx="14" cy="18" r="2.5" fill="#FFFFFF" />
          <Line x1="14" y1="18" x2="14" y2="24" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 7. Error Cloud Illustration (Image 2 Screen 6):
 * "Something went wrong"
 * Cloud with red exclamation mark circle.
 */
export function ErrorCloudIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <Circle cx="60" cy="62" r="48" fill="#EDF3DF" opacity={0.6} />

        {/* Soft Cloud */}
        <G transform="translate(18, 30)">
          <Path
            d="M24 44 H68 C76 44 82 38 82 30 C82 23 77 18 70 17 C68 8 60 2 50 2 C42 2 35 6 32 13 C29 12 26 12 24 13 C15 15 8 23 8 32 C8 39 15 44 24 44 Z"
            fill="#D5CDCB"
            opacity={0.7}
          />
        </G>

        {/* Center Red Exclamation Badge */}
        <Circle cx="60" cy="54" r="16" fill="#5B692D" />
        <SvgText
          x="60"
          y="60"
          fill="#FFFFFF"
          fontSize="20"
          fontWeight="bold"
          textAnchor="middle"
        >
          !
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * 8. Calendar with Clock Badge Illustration (Image 3 Screen 1):
 * "No attendance records yet" (History tab empty state)
 */
export function CalendarClockIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        {/* Soft blush background blob */}
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Calendar Body */}
        <G transform="translate(24, 24)">
          <Rect
            x="4"
            y="6"
            width="50"
            height="46"
            rx="6"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          {/* Top header bar */}
          <Path d="M4 6 H54 V16 H4 Z" fill="#FCE9E7" />
          <Line x1="4" y1="16" x2="54" y2="16" stroke="#5B692D" strokeWidth="2" />

          {/* Binder rings */}
          <Rect x="14" y="2" width="4" height="8" rx="2" fill="#5B692D" />
          <Rect x="40" y="2" width="4" height="8" rx="2" fill="#5B692D" />

          {/* Grid dots/lines */}
          <Circle cx="16" cy="24" r="2" fill="#5B692D" opacity={0.6} />
          <Circle cx="29" cy="24" r="2" fill="#5B692D" opacity={0.6} />
          <Circle cx="42" cy="24" r="2" fill="#5B692D" opacity={0.6} />
          <Circle cx="16" cy="34" r="2" fill="#5B692D" opacity={0.6} />
          <Circle cx="29" cy="34" r="2" fill="#5B692D" opacity={0.6} />
          <Circle cx="42" cy="34" r="2" fill="#5B692D" opacity={0.6} />
        </G>

        {/* Clock badge at bottom right */}
        <G transform="translate(62, 54)">
          <Circle cx="14" cy="14" r="14" fill="#5B692D" />
          <Line x1="14" y1="7" x2="14" y2="14" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="14" y1="14" x2="19" y2="14" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 9. Document with Checkmark Badge Illustration (Image 3 Screen 2):
 * "All caught up" (Requests empty state)
 */
export function DocCheckmarkIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Document Body */}
        <G transform="translate(30, 22)">
          <Rect
            x="4"
            y="4"
            width="44"
            height="56"
            rx="6"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          {/* Document lines */}
          <Line x1="14" y1="18" x2="38" y2="18" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="14" y1="28" x2="38" y2="28" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="14" y1="38" x2="28" y2="38" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        </G>

        {/* Red Checkmark badge at bottom right */}
        <G transform="translate(60, 56)">
          <Circle cx="14" cy="14" r="14" fill="#5B692D" />
          <Path
            d="M8 14 L12 18 L20 10"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 10. People Group with Plus Badge Illustration (Image 3 Screen 3):
 * "No employees yet" (Employees empty state)
 */
export function PeopleGroupPlusIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Three people avatars */}
        <G transform="translate(24, 28)">
          {/* Left Person */}
          <Circle cx="16" cy="14" r="7" stroke="#5B692D" strokeWidth="2" fill="#FFFFFF" />
          <Path d="M6 32 C6 24 10 21 16 21 C22 21 26 24 26 32" stroke="#5B692D" strokeWidth="2" fill="#FFFFFF" />

          {/* Right Person */}
          <Circle cx="44" cy="14" r="7" stroke="#5B692D" strokeWidth="2" fill="#FFFFFF" />
          <Path d="M34 32 C34 24 38 21 44 21 C50 21 54 24 54 32" stroke="#5B692D" strokeWidth="2" fill="#FFFFFF" />

          {/* Center Main Person */}
          <Circle cx="30" cy="12" r="9" stroke="#5B692D" strokeWidth="2.5" fill="#FFFFFF" />
          <Path d="M18 34 C18 25 23 22 30 22 C37 22 42 25 42 34" stroke="#5B692D" strokeWidth="2.5" fill="#FFFFFF" />
        </G>

        {/* Red Plus badge at bottom right */}
        <G transform="translate(64, 56)">
          <Circle cx="13" cy="13" r="13" fill="#5B692D" />
          <Line x1="13" y1="7" x2="13" y2="19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="7" y1="13" x2="19" y2="13" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 11. Document with Magnifying Glass Illustration (Image 3 Screen 4):
 * "No matching employees" (Attendance search empty state)
 */
export function SearchEmptyDocIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Document paper */}
        <G transform="translate(28, 22)">
          <Rect
            x="4"
            y="4"
            width="42"
            height="54"
            rx="6"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          <Line x1="12" y1="18" x2="34" y2="18" stroke="#5B692D" strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="12" y1="28" x2="26" y2="28" stroke="#5B692D" strokeWidth="2.2" strokeLinecap="round" />
        </G>

        {/* Magnifying Glass with red stroke */}
        <G transform="translate(52, 46)">
          <Circle cx="16" cy="16" r="13" stroke="#5B692D" strokeWidth="3" fill="#FFFFFF" />
          <Line x1="26" y1="26" x2="38" y2="38" stroke="#5B692D" strokeWidth="3.5" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 12. Envelope with Person+ Badge Illustration (Image 3 Screen 5):
 * "No invitations yet" (Invitations empty state)
 */
export function EnvelopePersonPlusIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Open Envelope */}
        <G transform="translate(26, 32)">
          <Rect
            x="4"
            y="8"
            width="52"
            height="38"
            rx="6"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          <Path d="M5 10 L30 30 L55 10" stroke="#5B692D" strokeWidth="2" strokeLinejoin="round" />
        </G>

        {/* Red Person+ badge at bottom right */}
        <G transform="translate(62, 52)">
          <Circle cx="14" cy="14" r="14" fill="#5B692D" />
          {/* Person head */}
          <Circle cx="12" cy="10" r="4" fill="#FFFFFF" />
          {/* Person shoulder */}
          <Path d="M6 21 C6 17 9 15 12 15 C15 15 18 17 18 21" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
          {/* Plus sign */}
          <Line x1="20" y1="10" x2="20" y2="16" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="17" y1="13" x2="23" y2="13" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 13. Bar Chart with Magnifying Glass Illustration (Image 3 Screen 6):
 * "No records for this period" (Reports empty state)
 */
export function BarChartSearchIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Bar chart bars */}
        <G transform="translate(24, 30)">
          <Rect x="6" y="28" width="8" height="22" rx="2" fill="#8D9F56" />
          <Rect x="18" y="14" width="8" height="36" rx="2" fill="#5B692D" />
          <Rect x="30" y="6" width="8" height="44" rx="2" fill="#6C7D38" opacity={0.6} />
          {/* Baseline */}
          <Line x1="2" y1="50" x2="52" y2="50" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        </G>

        {/* Magnifying Glass */}
        <G transform="translate(54, 46)">
          <Circle cx="14" cy="14" r="12" stroke="#5B692D" strokeWidth="3" fill="#FFFFFF" />
          <Line x1="23" y1="23" x2="34" y2="34" stroke="#5B692D" strokeWidth="3.5" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 14. Camera Access Off Illustration (Image 4 Screen 1):
 * Smartphone with camera lens crossed out by red slash.
 */
export function CameraOffIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Smartphone body */}
        <G transform="translate(35, 18)">
          <Rect
            x="4"
            y="4"
            width="34"
            height="64"
            rx="8"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          {/* Screen notch */}
          <Line x1="16" y1="9" x2="26" y2="9" stroke="#5B692D" strokeWidth="2" strokeLinecap="round" />

          {/* Camera icon in center of screen */}
          <Rect x="11" y="28" width="20" height="15" rx="3" fill="#5B692D" opacity={0.8} />
          <Circle cx="21" cy="35" r="4" fill="#FFFFFF" />

          {/* Red diagonal slash */}
          <Line x1="6" y1="20" x2="36" y2="52" stroke="#5B692D" strokeWidth="3" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 15. Invalid QR Code Illustration (Image 4 Screen 2):
 * "This isn't a workplace QR"
 * Hand holding QR card with red X circle badge.
 */
export function InvalidQrIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Hand holding ticket */}
        <G transform="translate(24, 24)">
          {/* QR code Card */}
          <Rect
            x="14"
            y="6"
            width="38"
            height="46"
            rx="4"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2"
          />
          {/* QR grid pattern inside */}
          <Rect x="20" y="12" width="8" height="8" fill="#5B692D" />
          <Rect x="38" y="12" width="8" height="8" fill="#5B692D" />
          <Rect x="20" y="30" width="8" height="8" fill="#5B692D" />
          <Rect x="32" y="24" width="4" height="4" fill="#5B692D" />
          <Rect x="38" y="30" width="8" height="8" fill="#5B692D" />

          {/* Hand holding */}
          <Path
            d="M6 56 C14 50 20 44 26 44 H34 C36 44 38 46 38 48 C38 52 32 58 24 64"
            stroke="#2C3615"
            strokeWidth="2.5"
            fill="#F9D2BA"
            strokeLinecap="round"
          />
        </G>

        {/* Red X Badge on top right */}
        <G transform="translate(68, 20)">
          <Circle cx="12" cy="12" r="12" fill="#5B692D" />
          <Line x1="7" y1="7" x2="17" y2="17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="17" y1="7" x2="7" y2="17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 16. Closed Signboard Illustration (Image 4 Screen 3):
 * "Attendance session closed"
 * Hanging red "CLOSED" signboard with clock badge.
 */
export function ClosedSignIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Hanging ropes from top */}
        <Line x1="30" y1="20" x2="40" y2="34" stroke="#5B692D" strokeWidth="2" />
        <Line x1="80" y1="20" x2="70" y2="34" stroke="#5B692D" strokeWidth="2" />

        {/* CLOSED Board */}
        <G transform="translate(22, 34)">
          <Rect
            x="4"
            y="2"
            width="60"
            height="34"
            rx="6"
            fill="#5B692D"
            stroke="#6A131C"
            strokeWidth="2"
          />
          <Rect x="8" y="6" width="52" height="26" rx="4" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity={0.6} />
          <SvgText
            x="34"
            y="23"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing={1}
          >
            CLOSED
          </SvgText>
        </G>

        {/* Clock badge at bottom right */}
        <G transform="translate(66, 52)">
          <Circle cx="14" cy="14" r="14" fill="#FFFFFF" stroke="#5B692D" strokeWidth="2.5" />
          <Line x1="14" y1="7" x2="14" y2="14" stroke="#5B692D" strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="14" y1="14" x2="19" y2="14" stroke="#5B692D" strokeWidth="2.2" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 17. Paper Plane Offline Illustration (Image 4 Screen 4):
 * "Request not sent — you're offline"
 * Paper plane flying into clouds with red X badge.
 */
export function PaperPlaneOfflineIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Soft background cloud */}
        <Path
          d="M20 62 H54 C59 62 64 58 64 53 C64 49 61 45 56 44 C55 38 49 33 42 33 C37 33 32 36 30 40 C28 40 26 40 24 41 C19 43 15 48 15 54 C15 58 19 62 20 62 Z"
          fill="#DFD9D6"
          opacity={0.8}
        />

        {/* Paper airplane flying */}
        <G transform="translate(28, 20)">
          <Polygon
            points="46,2 6,36 28,42 46,2"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <Polygon points="28,42 46,2 26,24 28,42" fill="#FCE9E7" />
        </G>

        {/* Red X Badge */}
        <G transform="translate(68, 54)">
          <Circle cx="13" cy="13" r="13" fill="#5B692D" />
          <Line x1="8" y1="8" x2="18" y2="18" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="18" y1="8" x2="8" y2="18" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 18. Document Exclamation Illustration (Image 4 Screen 5):
 * "Couldn't load requests"
 * Document with lines and red exclamation badge.
 */
export function DocExclamationIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Document Body */}
        <G transform="translate(30, 22)">
          <Rect
            x="4"
            y="4"
            width="44"
            height="56"
            rx="6"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          <Line x1="14" y1="18" x2="38" y2="18" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="14" y1="28" x2="38" y2="28" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="14" y1="38" x2="28" y2="38" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        </G>

        {/* Red Exclamation badge at bottom right */}
        <G transform="translate(62, 54)">
          <Circle cx="14" cy="14" r="14" fill="#5B692D" />
          <SvgText
            x="14"
            y="19"
            fill="#FFFFFF"
            fontSize="18"
            fontWeight="bold"
            textAnchor="middle"
          >
            !
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/**
 * 19. Dual Phone Reviewed Illustration (Image 4 Screen 6):
 * "Already reviewed"
 * Two smartphones (one with checkmark, one with red X).
 */
export function DualPhoneReviewedIllustration({ size = 110 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        <Circle cx="55" cy="55" r="46" fill="#EDF3DF" />

        {/* Left Smartphone (Checkmark) */}
        <G transform="translate(20, 26)">
          <Rect
            x="2"
            y="4"
            width="28"
            height="48"
            rx="6"
            fill="#FFFFFF"
            stroke="#A89F9A"
            strokeWidth="2"
          />
          <Circle cx="16" cy="26" r="9" fill="#5B692D" opacity={0.3} />
          <Path
            d="M12 26 L15 29 L20 23"
            stroke="#5B692D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* Right Smartphone (Red X) */}
        <G transform="translate(48, 18)">
          <Rect
            x="4"
            y="4"
            width="34"
            height="58"
            rx="7"
            fill="#FFFFFF"
            stroke="#5B692D"
            strokeWidth="2.5"
          />
          <Circle cx="21" cy="30" r="12" fill="#5B692D" />
          <Line x1="16" y1="25" x2="26" y2="35" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="26" y1="25" x2="16" y2="35" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * 20. Session Closed Padlock Illustration:
 * Padlock on soft blush blob.
 */
export function SessionClosedPadlockIllustration({ size = 90 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size} viewBox="0 0 90 90" fill="none">
        <Circle cx="45" cy="45" r="38" fill="#EDF3DF" />
        {/* Shackle */}
        <Path
          d="M33 38 V26 C33 19.4 38.4 14 45 14 C51.6 14 57 19.4 57 26 V38"
          stroke="#5B692D"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Body */}
        <Rect x="25" y="34" width="40" height="32" rx="6" fill="#5B692D" />
        {/* Keyhole */}
        <Circle cx="45" cy="48" r="3.5" fill="#FFFFFF" />
        <Line x1="45" y1="48" x2="45" y2="56" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/**
 * Storefront Welcome Shop Illustration (matching image Screen 1)
 * Authentic retail shop with striped scalloped awning, display window, shop door, tree, and background clouds
 */
export function StorefrontShopIllustration({
  width = 340,
  height = 243,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <View style={styles.center}>
      <Svg width={width} height={height} viewBox="0 0 280 200" fill="none">
        {/* Soft background shrub/cloud shapes in warm sage tint */}
        <Circle cx="218" cy="142" r="26" fill="#EDF3DF" />
        <Circle cx="236" cy="148" r="18" fill="#EDF3DF" />
        <Circle cx="226" cy="96" r="18" fill="#EDF3DF" opacity={0.7} />
        <Circle cx="240" cy="102" r="13" fill="#EDF3DF" opacity={0.6} />
        <Circle cx="88" cy="122" r="22" fill="#EDF3DF" opacity={0.6} />

        {/* Ground Baseline */}
        <Line x1="24" y1="165" x2="256" y2="165" stroke="#5B692D" strokeWidth={2.5} strokeLinecap="round" />

        {/* Accent dash floating above roof */}
        <Line x1="147" y1="52" x2="163" y2="52" stroke="#5B692D" strokeWidth={2.5} strokeLinecap="round" />

        {/* Tree on the left */}
        <G id="tree">
          <Line x1="54" y1="165" x2="54" y2="112" stroke="#5B692D" strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx="54" cy="110" rx="16" ry="26" fill="#EDF3DF" stroke="#5B692D" strokeWidth={2.5} />
          <Line x1="54" y1="95" x2="54" y2="127" stroke="#5B692D" strokeWidth={1.5} strokeLinecap="round" />
        </G>

        {/* Shop Building Facade */}
        <Rect x="88" y="84" width="134" height="81" rx={2} fill="#FFFFFF" stroke="#5B692D" strokeWidth={2.5} />

        {/* Roof Cornice / Ledge */}
        <Rect x="92" y="64" width="126" height="8" rx={2} fill="#FFFFFF" stroke="#5B692D" strokeWidth={2.5} />

        {/* Striped Scalloped Awning */}
        <G id="awning">
          {/* Stripe 1 (Olive) */}
          <Path d="M94 72 L86 96 Q86 106 97 106 Q108 106 108 96 L113 72 Z" fill="#5B692D" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
          {/* Stripe 2 (White) */}
          <Path d="M113 72 L108 96 Q108 106 120 106 Q130 106 130 96 L133 72 Z" fill="#FFFFFF" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
          {/* Stripe 3 (Olive) */}
          <Path d="M133 72 L130 96 Q130 106 142 106 Q153 106 153 96 L153 72 Z" fill="#5B692D" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
          {/* Stripe 4 (White) */}
          <Path d="M153 72 L153 96 Q153 106 165 106 Q176 106 176 96 L174 72 Z" fill="#FFFFFF" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
          {/* Stripe 5 (Olive) */}
          <Path d="M174 72 L176 96 Q176 106 187 106 Q198 106 198 96 L194 72 Z" fill="#5B692D" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
          {/* Stripe 6 (White) */}
          <Path d="M194 72 L198 96 Q198 106 209 106 Q219 106 219 96 L214 72 Z" fill="#FFFFFF" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
          {/* Stripe 7 (Olive outer corner) */}
          <Path d="M214 72 L219 96 Q219 106 226 106 Q231 106 226 96 L218 72 Z" fill="#5B692D" stroke="#5B692D" strokeWidth={2} strokeLinejoin="round" />
        </G>

        {/* Shop Window */}
        <G id="window">
          <Rect x="102" y="114" width="50" height="40" rx={2} fill="#F7F9F2" stroke="#5B692D" strokeWidth={2.5} />
          <Line x1="127" y1="114" x2="127" y2="154" stroke="#5B692D" strokeWidth={2} />
          {/* Window glare lines */}
          <Line x1="108" y1="144" x2="120" y2="122" stroke="#E0E8D2" strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="133" y1="144" x2="145" y2="122" stroke="#E0E8D2" strokeWidth={1.5} strokeLinecap="round" />
        </G>

        {/* Shop Door */}
        <G id="door">
          <Rect x="166" y="114" width="32" height="51" rx={1.5} fill="#5B692D" stroke="#5B692D" strokeWidth={2} />
          <Rect x="170" y="118" width="24" height="43" rx={1} fill="none" stroke="#6C7D38" strokeWidth={1.5} opacity={0.6} />
          <Circle cx="172" cy="140" r={2.5} fill="#FFFFFF" />
        </G>
      </Svg>
    </View>
  );
}

export function WelcomeIllustration(props: { width?: number; height?: number }) {
  return <StorefrontShopIllustration {...props} />;
}

/**
 * Invite Envelope Illustration (Mockup Screen 4)
 */
export function InviteEnvelopeIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size * 0.85} viewBox="0 0 140 120" fill="none">
        {/* Accent Rays Left */}
        <Line x1="18" y1="46" x2="28" y2="52" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="14" y1="62" x2="26" y2="62" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="18" y1="78" x2="28" y2="72" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />

        {/* Accent Rays Right */}
        <Line x1="122" y1="46" x2="112" y2="52" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="126" y1="62" x2="114" y2="62" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="122" y1="78" x2="112" y2="72" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />

        {/* Envelope Body */}
        <Rect x="34" y="32" width="72" height="52" rx="8" fill="#FCECEB" stroke="#5B692D" strokeWidth="2" />
        {/* Flap lines */}
        <Path d="M36 36 L70 60 L104 36" stroke="#5B692D" strokeWidth="2" strokeLinejoin="round" fill="none" />
        <Line x1="36" y1="82" x2="56" y2="62" stroke="#5B692D" strokeWidth="1.5" strokeOpacity={0.4} />
        <Line x1="104" y1="82" x2="84" y2="62" stroke="#5B692D" strokeWidth="1.5" strokeOpacity={0.4} />

        {/* Center Checkmark Badge */}
        <Circle cx="70" cy="56" r="14" fill="#5B692D" />
        <Path d="M64 56 L68 60 L76 52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/**
 * Invite Failed / Invalid Illustration (Mockup Screen 6)
 */
export function InviteFailedIllustration({ size = 120 }: { size?: number }) {
  return (
    <View style={styles.center}>
      <Svg width={size} height={size * 0.9} viewBox="0 0 140 120" fill="none">
        {/* Accent Rays Left */}
        <Line x1="22" y1="46" x2="32" y2="52" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="18" y1="62" x2="30" y2="62" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="22" y1="78" x2="32" y2="72" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />

        {/* Accent Rays Right */}
        <Line x1="118" y1="46" x2="108" y2="52" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="122" y1="62" x2="110" y2="62" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="118" y1="78" x2="108" y2="72" stroke="#5B692D" strokeWidth="2.5" strokeLinecap="round" />

        {/* Document Sheet */}
        <Path
          d="M44 24 H82 L96 38 V92 C96 96 92 100 88 100 H44 C40 100 36 96 36 92 V32 C36 28 40 24 44 24 Z"
          fill="#FFFFFF"
          stroke="#5B692D"
          strokeWidth="2"
        />
        {/* Folded corner */}
        <Path d="M82 24 V38 H96" fill="#FCECEB" stroke="#5B692D" strokeWidth="2" />
        {/* Document lines */}
        <Line x1="46" y1="44" x2="74" y2="44" stroke="#F4C6C9" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="46" y1="54" x2="68" y2="54" stroke="#F4C6C9" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="46" y1="64" x2="76" y2="64" stroke="#F4C6C9" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="46" y1="74" x2="62" y2="74" stroke="#F4C6C9" strokeWidth="2.5" strokeLinecap="round" />

        {/* Center Cross / X Badge */}
        <Circle cx="86" cy="74" r="14" fill="#5B692D" />
        <Line x1="81" y1="69" x2="91" y2="79" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="91" y1="69" x2="81" y2="79" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/**
 * Empty History Illustration
 */
export function EmptyHistoryIllustration({ size = 100 }: { size?: number }) {
  return <CalendarClockIllustration size={size} />;
}

/**
 * Empty Team Illustration
 */
export function EmptyTeamIllustration({ size = 100 }: { size?: number }) {
  return <PeopleGroupPlusIllustration size={size} />;
}

/**
 * Empty Requests Illustration
 */
export function EmptyRequestsIllustration({ size = 100 }: { size?: number }) {
  return <DocCheckmarkIllustration size={size} />;
}

/**
 * Expired / Revoked Invite Illustration
 */
export function ExpiredInviteIllustration({ size = 90 }: { size?: number }) {
  return <ExpiredInviteDocIllustration size={size} />;
}

/**
 * Offline Illustration
 */
export function OfflineIllustration({ size = 90 }: { size?: number }) {
  return <PaperPlaneOfflineIllustration size={size} />;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
