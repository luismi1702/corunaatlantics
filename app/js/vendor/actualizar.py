# Baja aquí las librerías de terceros, con todo lo que arrastran.
#
# Por qué no se cargan del CDN al abrir la app: ese código corre dentro de
# corunaatlantics.com y ve la sesión de quien esté usando la app, o sea, todo lo
# que esa persona pueda leer. Un módulo ESM no admite `integrity`, así que el
# navegador se traga lo que devuelva el CDN, sea lo que sea. Bajadas aquí, lo
# que se publica es lo que se ha revisado, y la app no depende de que jsDelivr
# esté vivo.
#
# Se ejecuta a mano, solo para actualizar de versión:
#   python actualizar.py     (desde app/js/vendor)
#
# Después hay que probar la app: si una versión nueva cambia algo, se ve aquí y
# no en el móvil de la plantilla.

import io, os, re, urllib.request

BASE = 'https://cdn.jsdelivr.net'

# Lo que pide la app. El resto del árbol se descubre solo.
RAICES = [
    '/npm/@supabase/supabase-js@2.115.0/+esm',
    '/npm/qrcode-generator@1.4.4/+esm',
]

# /npm/@supabase/auth-js@2.115.0/+esm  ->  supabase-auth-js-2.115.0.js
def nombre_local(ruta):
    paquete = ruta[len('/npm/'):-len('/+esm')].lstrip('@')
    return paquete.replace('/', '-').replace('@', '-') + '.js'

def bajar():
    pendientes, modulos = list(RAICES), {}
    while pendientes:
        ruta = pendientes.pop()
        if ruta in modulos:
            continue
        print('bajando', ruta)
        modulos[ruta] = urllib.request.urlopen(BASE + ruta, timeout=60).read().decode('utf-8')
        pendientes += [r for r in re.findall(r'["\'](/npm/[^"\']+)["\']', modulos[ruta])
                       if r not in modulos]
    return modulos

modulos = bajar()

for ruta, texto in modulos.items():
    # Cada referencia al CDN pasa a ser el fichero de al lado.
    for otra in modulos:
        texto = texto.replace(otra, './' + nombre_local(otra))
    io.open(nombre_local(ruta), 'w', encoding='utf-8', newline='\n').write(texto)

# Si queda una sola referencia a internet, esto deja de servir para lo que se
# hizo. Mejor enterarse aquí que en producción.
for ruta in modulos:
    texto = io.open(nombre_local(ruta), encoding='utf-8').read()
    fuera = re.findall(r'from\s*["\'](https?://[^"\']+)["\']', texto)
    assert not fuera, (nombre_local(ruta), fuera)

print('\n%d módulos, %d KB:' % (len(modulos), sum(os.path.getsize(nombre_local(r)) for r in modulos) // 1024))
for r in sorted(modulos):
    print(' ', nombre_local(r))
