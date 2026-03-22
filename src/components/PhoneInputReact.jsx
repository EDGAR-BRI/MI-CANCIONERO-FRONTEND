import React, { useEffect, useMemo, useState } from "react";

const FALLBACK_PREFIXES = [
    { code: "+54", label: "AR +54" },
    { code: "+52", label: "MX +52" },
    { code: "+57", label: "CO +57" },
    { code: "+56", label: "CL +56" },
    { code: "+51", label: "PE +51" },
    { code: "+34", label: "ES +34" },
    { code: "+1", label: "US +1" },
];

const dedupePrefixes = (list) => {
    const bestByCountry = new Map();

    for (const item of list) {
        if (!item?.code || !item?.label) continue;

        const iso2 = String(item.label).split(" ")[0] || item.label;
        const current = bestByCountry.get(iso2);

        if (
            !current ||
            item.code.length < current.code.length ||
            (item.code.length === current.code.length && item.code < current.code)
        ) {
            bestByCountry.set(iso2, item);
        }
    }

    return Array.from(bestByCountry.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const PhoneInputSkeleton = () => {
    return (
        <div className="grid grid-cols-[120px_1fr] gap-2 animate-pulse">
            <div className="h-[50px] rounded-lg bg-white/10" />
            <div className="h-[50px] rounded-lg bg-white/10" />
        </div>
    );
};

const PhoneInputReact = ({ apiUrl = "http://localhost:3000/api" }) => {
    const [loading, setLoading] = useState(true);
    const [prefixes, setPrefixes] = useState(FALLBACK_PREFIXES);
    const [selectedPrefix, setSelectedPrefix] = useState("+54");
    const [localNumber, setLocalNumber] = useState("");

    useEffect(() => {
        let mounted = true;

        const loadPrefixes = async () => {
            try {
                const response = await fetch(`${apiUrl}/meta/phone-prefixes`);
                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                const dynamicPrefixes = Array.isArray(payload?.prefixes)
                    ? payload.prefixes
                        .filter((p) => p?.code && p?.label)
                        .map((p) => ({ code: p.code, label: p.label }))
                    : [];

                if (mounted && dynamicPrefixes.length) {
                    const uniquePrefixes = dedupePrefixes(dynamicPrefixes);
                    setPrefixes(uniquePrefixes);
                    const hasAr = uniquePrefixes.some((p) => p.code === "+54");
                    setSelectedPrefix(hasAr ? "+54" : uniquePrefixes[0].code);
                }
            } catch (error) {
                // Keep fallback prefixes if API is unavailable.
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadPrefixes();

        return () => {
            mounted = false;
        };
    }, [apiUrl]);

    const sanitizedLocalNumber = useMemo(() => localNumber.replace(/\D/g, ""), [localNumber]);
    const fullPhoneNumber = sanitizedLocalNumber ? `${selectedPrefix}${sanitizedLocalNumber}` : "";

    return (
        <div>
            {loading ? (
                <PhoneInputSkeleton />
            ) : (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                    <select
                        id="phonePrefix"
                        value={selectedPrefix}
                        onChange={(e) => setSelectedPrefix(e.target.value)}
                        className="bg-bg-main border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-accent-main transition-colors"
                    >
                        {prefixes.map((prefix) => (
                            <option key={`${prefix.label}-${prefix.code}`} value={prefix.code}>
                                {prefix.label}
                            </option>
                        ))}
                    </select>
                    <input
                        type="tel"
                        id="phoneLocal"
                        inputMode="numeric"
                        value={localNumber}
                        onChange={(e) => setLocalNumber(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-bg-main border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-main transition-colors"
                        placeholder="91112345678"
                    />
                </div>
            )}

            <input type="hidden" id="phoneNumber" name="phoneNumber" value={fullPhoneNumber} readOnly />
            <p className="mt-2 text-xs text-text-secondary">
                Opcional. Solo numeros, sin espacios. Se enviara en formato internacional.
            </p>
        </div>
    );
};

export default PhoneInputReact;
