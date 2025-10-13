#!/usr/bin/env python3
"""Script de teste para verificar o filtro de profanidade."""

import sys
sys.path.insert(0, 'backend')

from app.utils.profanity_filter import censor_segments

# Teste com palavras de diferentes tamanhos
segments = [
    {
        'start': 0.0,
        'end': 5.0,
        'text': 'Este video tem uma abelha e um mal'
    },
    {
        'start': 5.0,
        'end': 10.0,
        'text': 'O pai disse que o filho é chato'
    }
]

forbidden = ['abelha', 'mal', 'pai', 'chato']

sanitized, beeps = censor_segments(segments, forbidden)

print("\n=== TESTE DO FILTRO DE PROFANIDADE ===\n")
print("Palavras proibidas:", forbidden)
print("\n--- RESULTADO ---\n")

for i, (start, end, text) in enumerate(sanitized):
    original = segments[i]['text']
    print(f"Segmento {i+1} ({start:.1f}s - {end:.1f}s):")
    print(f"  Original: {original}")
    print(f"  Censurado: {text}")
    
    # Contar asteriscos para cada palavra
    for word in forbidden:
        if word in original.lower():
            asterisk_count = text.count('*')
            print(f"    → '{word}' ({len(word)} letras) foi substituído por {asterisk_count} asteriscos")
    print()

print(f"\n--- BEEPS ({len(beeps)} intervalos) ---\n")
for i, (start, end) in enumerate(beeps):
    print(f"  Beep {i+1}: {start:.2f}s até {end:.2f}s (duração: {end-start:.2f}s)")

print("\n✓ Se os asteriscos correspondem ao tamanho das palavras, está funcionando!")
