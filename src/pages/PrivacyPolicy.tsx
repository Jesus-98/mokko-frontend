import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function PrivacyPolicy() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Legal · Privacidad
              </span>

              <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
                Política de <span className="text-[#E8C547]">Privacidad</span>
              </h1>

              <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base sm:leading-8">
                Última actualización: 16 de abril de 2026
              </p>

              <div className="mt-8 space-y-8 text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
                <section>
                  <h2 className="text-xl font-semibold text-white">
                    1. ¿Quiénes somos?
                  </h2>
                  <p className="mt-3">
                    Mokko es una solución de identificación inteligente para
                    mascotas que permite asociar una placa física con un perfil
                    digital accesible mediante código o lectura compatible con el
                    dispositivo del usuario. En esta etapa MVP, Mokko permite
                    crear cuentas, registrar mascotas, activar placas, gestionar
                    perfiles públicos, recibir reportes de hallazgo y, cuando
                    corresponda, habilitar un perfil médico.
                  </p>
                  <p className="mt-3">
                    Si tienes consultas sobre esta Política de Privacidad,
                    puedes contactarnos en{" "}
                    <a
                      href="mailto:mokkopet@gmail.com"
                      className="text-[#E8C547] transition hover:text-[#f0cf55]"
                    >
                      mokkopet@gmail.com
                    </a>
                    .
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    2. ¿Qué datos recopilamos?
                  </h2>
                  <p className="mt-3">
                    Dependiendo de cómo uses Mokko, podemos recopilar y tratar
                    las siguientes categorías de información:
                  </p>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-white/75">
                    <li>
                      Datos de cuenta, como nombre completo, correo electrónico
                      y credenciales de acceso.
                    </li>
                    <li>
                      Datos de contacto, como teléfono, WhatsApp, país,
                      ubicación general y dirección ingresada por el usuario.
                    </li>
                    <li>
                      Datos de mascotas, como nombre, especie, raza, sexo,
                      color, fecha de nacimiento, peso, fotografía y otros datos
                      que el usuario decida registrar.
                    </li>
                    <li>
                      Datos de placas, como código de activación, tipo de placa,
                      estado y vínculo con una mascota.
                    </li>
                    <li>
                      Datos del perfil público de la mascota, según la
                      configuración elegida por el usuario.
                    </li>
                    <li>
                      Datos del perfil médico, si el usuario tiene esa función
                      habilitada y decide completar información como alergias,
                      condiciones, medicamentos, dieta u otros datos similares.
                    </li>
                    <li>
                      Datos de reportes de hallazgo, como nombre del reportante,
                      teléfono, nota, texto de ubicación y cualquier información
                      que un tercero o el propio usuario decida enviar.
                    </li>
                    <li>
                      Datos técnicos mínimos necesarios para el funcionamiento
                      del sitio, seguridad, prevención de fraude y mejora del
                      servicio.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    3. ¿Para qué usamos tus datos?
                  </h2>
                  <p className="mt-3">Usamos la información principalmente para:</p>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-white/75">
                    <li>crear y gestionar cuentas de usuario;</li>
                    <li>registrar mascotas y vincularlas con placas Mokko;</li>
                    <li>activar códigos y administrar estados de placas;</li>
                    <li>
                      mostrar el perfil público de la mascota conforme a la
                      configuración elegida por el usuario;
                    </li>
                    <li>
                      permitir el envío y recepción de reportes de hallazgo;
                    </li>
                    <li>
                      facilitar el contacto entre la persona que encuentra a una
                      mascota y su responsable, cuando el flujo del servicio lo
                      permita;
                    </li>
                    <li>
                      habilitar funciones complementarias, como historial de
                      vacunas o perfil médico, si están disponibles y activadas;
                    </li>
                    <li>brindar soporte, atención y seguimiento operativo;</li>
                    <li>
                      proteger la seguridad del sitio, de las cuentas y de la
                      operación de Mokko;
                    </li>
                    <li>
                      cumplir obligaciones legales, regulatorias o requerimientos
                      válidos de autoridad.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    4. Perfiles públicos y visibilidad
                  </h2>
                  <p className="mt-3">
                    Mokko permite que el usuario configure el nivel de
                    visibilidad del perfil digital de su mascota. En esta etapa
                    del servicio, pueden existir modos como público, privado o
                    modo perdido.
                  </p>
                  <p className="mt-3">
                    Eso significa que parte de la información de la mascota y
                    ciertos medios de contacto pueden ser visibles para terceros
                    si el usuario así lo configura. El usuario es responsable de
                    revisar y actualizar estas configuraciones antes de hacer
                    pública información en el perfil de su mascota.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    5. Geolocalización y reportes
                  </h2>
                  <p className="mt-3">
                    Mokko puede permitir que se comparta o registre una
                    ubicación cuando un usuario o un tercero decide enviarla en
                    un reporte o autoriza el uso de funciones compatibles del
                    dispositivo. Mokko no realiza rastreo continuo ni
                    geolocalización permanente de mascotas.
                  </p>
                  <p className="mt-3">
                    La ubicación que llegue a mostrarse o registrarse depende de
                    la interacción del usuario o del tercero que reporta, de la
                    conectividad y de las capacidades del dispositivo utilizado.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    6. ¿Con quién compartimos información?
                  </h2>
                  <p className="mt-3">
                    Podemos compartir información en los siguientes casos:
                  </p>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-white/75">
                    <li>
                      con terceros que accedan al perfil público de una mascota,
                      únicamente según la configuración elegida por el usuario;
                    </li>
                    <li>
                      con proveedores tecnológicos y de infraestructura que nos
                      ayudan a operar la plataforma;
                    </li>
                    <li>
                      con servicios de autenticación, almacenamiento, hosting,
                      base de datos, seguridad o comunicaciones;
                    </li>
                    <li>
                      cuando exista obligación legal, requerimiento válido de
                      autoridad o necesidad de proteger derechos, seguridad o
                      integridad del servicio.
                    </li>
                  </ul>

                  <p className="mt-3">
                    Mokko no vende datos personales como parte de su operación
                    ordinaria.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    7. Conservación de la información
                  </h2>
                  <p className="mt-3">
                    Conservamos los datos por el tiempo necesario para operar el
                    servicio, cumplir finalidades legítimas, mantener seguridad,
                    atender incidencias, cumplir obligaciones legales o resolver
                    controversias. Algunos datos podrán conservarse por plazos
                    adicionales cuando sea necesario para respaldo, seguridad,
                    auditoría o cumplimiento regulatorio.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    8. Seguridad
                  </h2>
                  <p className="mt-3">
                    Adoptamos medidas razonables de carácter técnico y
                    organizativo para reducir riesgos de acceso no autorizado,
                    pérdida, alteración o uso indebido de la información. Sin
                    embargo, ningún sistema es absolutamente infalible, por lo
                    que no podemos garantizar seguridad total en todos los
                    escenarios.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    9. Derechos del usuario
                  </h2>
                  <p className="mt-3">
                    El usuario puede solicitar información sobre sus datos y
                    ejercer, cuando corresponda, derechos de acceso,
                    rectificación, cancelación u oposición, así como otras
                    facultades que reconozca la normativa aplicable.
                  </p>
                  <p className="mt-3">
                    Para ejercer estos derechos o realizar consultas sobre el
                    tratamiento de datos, escríbenos a{" "}
                    <a
                      href="mailto:mokkopet@gmail.com"
                      className="text-[#E8C547] transition hover:text-[#f0cf55]"
                    >
                      mokkopet@gmail.com
                    </a>
                    .
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    10. Menores de edad
                  </h2>
                  <p className="mt-3">
                    Mokko no está pensado para ser utilizado de forma autónoma
                    por menores de edad sin supervisión de su representante
                    legal. Si detectamos que se registró información de manera
                    incompatible con esta regla, podremos limitar o eliminar el
                    acceso correspondiente.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    11. Servicios de terceros
                  </h2>
                  <p className="mt-3">
                    Parte de la operación de Mokko puede apoyarse en servicios de
                    terceros para autenticación, base de datos, almacenamiento,
                    hosting, analítica, seguridad o envío de comunicaciones.
                    Estos servicios pueden procesar información siguiendo sus
                    propios términos, condiciones y medidas de seguridad.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    12. Cambios a esta Política
                  </h2>
                  <p className="mt-3">
                    Podemos actualizar esta Política de Privacidad cuando sea
                    necesario para reflejar cambios en el servicio, en la
                    operación de Mokko o en la normativa aplicable. La versión
                    vigente será la publicada en esta página.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}