import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function TermsConditions() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Legal · Términos
              </span>

              <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
                Términos y <span className="text-[#E8C547]">Condiciones</span>
              </h1>

              <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base sm:leading-8">
                Última actualización: 16 de abril de 2026
              </p>

              <div className="mt-8 space-y-8 text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
                <section>
                  <h2 className="text-xl font-semibold text-white">
                    1. Objeto
                  </h2>
                  <p className="mt-3">
                    Estos Términos y Condiciones regulan el acceso y uso del
                    sitio web, paneles, perfiles públicos y servicios digitales
                    de Mokko relacionados con placas inteligentes para mascotas,
                    activación de códigos, gestión de mascotas, perfiles
                    digitales, reportes de hallazgo y funciones complementarias
                    disponibles en esta etapa MVP.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    2. Aceptación
                  </h2>
                  <p className="mt-3">
                    Al registrarte, navegar, activar una placa, usar un perfil
                    público, enviar un reporte o utilizar cualquier función de
                    Mokko, aceptas estos Términos y Condiciones. Si no estás de
                    acuerdo con ellos, debes abstenerte de usar el servicio.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    3. Qué es Mokko y qué no es
                  </h2>
                  <p className="mt-3">
                    Mokko es un sistema de identificación digital para mascotas.
                    Permite vincular una placa física con información digital
                    para facilitar el contacto y la gestión de datos cuando una
                    mascota es identificada por un tercero.
                  </p>
                  <p className="mt-3">
                    Mokko no es un GPS, no ofrece monitoreo en tiempo real, no
                    garantiza geolocalización continua, no reemplaza atención
                    veterinaria y no garantiza la recuperación de una mascota.
                    El funcionamiento depende, entre otros factores, de la
                    correcta activación de la placa, del estado del perfil, del
                    dispositivo utilizado por terceros y de la conectividad
                    disponible.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    4. Registro de cuenta
                  </h2>
                  <p className="mt-3">
                    Para acceder a determinadas funciones, el usuario debe crear
                    una cuenta con información veraz, actual y suficiente.
                  </p>
                  <p className="mt-3">
                    El usuario es responsable de custodiar sus credenciales de
                    acceso y de cualquier actividad realizada desde su cuenta. Si
                    detecta un uso no autorizado, deberá comunicarlo cuanto
                    antes a Mokko.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    5. Registro de mascotas
                  </h2>
                  <p className="mt-3">
                    El usuario puede registrar mascotas dentro de su cuenta,
                    asociando los datos que Mokko habilite en cada etapa del
                    servicio. El usuario declara que tiene legitimidad para
                    registrar esa mascota y la información relacionada con ella.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    6. Activación de placas
                  </h2>
                  <p className="mt-3">
                    La activación de una placa requiere el ingreso correcto del
                    código correspondiente y el cumplimiento de las validaciones
                    operativas definidas por Mokko.
                  </p>
                  <p className="mt-3">
                    Mokko podrá impedir o limitar la activación de placas cuando
                    el código no sea válido, no esté disponible, ya haya sido
                    activado, no corresponda al flujo permitido o no cumpla con
                    las condiciones operativas del sistema.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    7. Perfiles públicos y visibilidad
                  </h2>
                  <p className="mt-3">
                    El usuario puede configurar el nivel de visibilidad del
                    perfil digital de su mascota. Dependiendo del modo
                    seleccionado, cierta información podrá quedar visible para
                    terceros.
                  </p>
                  <p className="mt-3">
                    Es responsabilidad del usuario revisar qué datos decide hacer
                    visibles, incluyendo nombre de la mascota, medios de
                    contacto, mensajes personalizados, información médica
                    habilitada u otra información mostrada en el perfil.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    8. Perfil médico y vacunas
                  </h2>
                  <p className="mt-3">
                    Mokko puede habilitar funciones adicionales, como perfil
                    médico o registro de vacunas, para determinadas mascotas,
                    planes o placas.
                  </p>
                  <p className="mt-3">
                    Toda información médica o veterinaria registrada en Mokko es
                    ingresada por el usuario o por quien este autorice. El
                    usuario es responsable de mantenerla actualizada y verificar
                    su exactitud.
                  </p>
                  <p className="mt-3">
                    Mokko no sustituye evaluación, diagnóstico ni tratamiento
                    veterinario profesional.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    9. Reportes de hallazgo
                  </h2>
                  <p className="mt-3">
                    Mokko puede permitir que terceros o usuarios envíen reportes
                    relacionados con una mascota, incluyendo notas, medios de
                    contacto o ubicación, cuando el flujo del servicio lo
                    permita.
                  </p>
                  <p className="mt-3">
                    Mokko no garantiza la veracidad, disponibilidad, exactitud ni
                    oportunidad de la información proporcionada por terceros en
                    dichos reportes.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    10. Compras, pedidos y fabricación
                  </h2>
                  <p className="mt-3">
                    Cuando Mokko ofrezca venta de placas, pedidos, activaciones o
                    funciones vinculadas a producción física, cada solicitud
                    estará sujeta a disponibilidad, validación operativa,
                    confirmación de datos y estado del pedido.
                  </p>
                  <p className="mt-3">
                    En esta etapa MVP, algunos flujos pueden cambiar, mejorar o
                    ajustarse conforme evolucione el servicio.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    11. Obligaciones del usuario
                  </h2>
                  <p className="mt-3">El usuario se compromete a:</p>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-white/75">
                    <li>proporcionar información verdadera y actualizada;</li>
                    <li>
                      usar Mokko solo con fines legítimos y compatibles con el
                      servicio;
                    </li>
                    <li>
                      no suplantar a terceros ni registrar información sin
                      autorización;
                    </li>
                    <li>
                      no interferir con la seguridad, infraestructura o normal
                      funcionamiento del sitio;
                    </li>
                    <li>
                      no usar Mokko para fines ilícitos, abusivos, engañosos o
                      lesivos para terceros.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    12. Suspensión o cancelación
                  </h2>
                  <p className="mt-3">
                    Mokko podrá suspender, limitar o cancelar cuentas, perfiles,
                    placas o accesos cuando detecte incumplimientos a estos
                    términos, riesgos operativos, uso indebido, intentos de
                    fraude, afectación a terceros o requerimientos legales.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    13. Propiedad intelectual
                  </h2>
                  <p className="mt-3">
                    La marca Mokko, el sitio web, diseño, estructura, código,
                    logotipos, textos, interfaces y demás elementos del servicio
                    son de titularidad de Mokko o se usan legítimamente. No
                    pueden ser reproducidos, distribuidos o explotados sin
                    autorización previa, salvo cuando la ley lo permita.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    14. Limitación de responsabilidad
                  </h2>
                  <p className="mt-3">
                    Mokko pone a disposición una herramienta digital de apoyo
                    para identificación y contacto, pero no asume responsabilidad
                    por:
                  </p>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-white/75">
                    <li>la pérdida, robo o daño de la mascota;</li>
                    <li>la no recuperación de una mascota;</li>
                    <li>
                      fallas derivadas de conectividad, dispositivos de terceros
                      o uso incorrecto de la placa;
                    </li>
                    <li>
                      errores u omisiones en la información ingresada por
                      usuarios o terceros;
                    </li>
                    <li>
                      interrupciones, caídas temporales o ajustes del servicio
                      propios de una etapa MVP.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    15. Modificaciones del servicio
                  </h2>
                  <p className="mt-3">
                    Mokko puede modificar, actualizar, reemplazar, limitar o
                    descontinuar funciones, flujos, interfaces, planes, páginas
                    o características del servicio, especialmente durante esta
                    etapa MVP.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    16. Modificaciones de estos términos
                  </h2>
                  <p className="mt-3">
                    Mokko puede actualizar estos Términos y Condiciones cuando
                    lo considere necesario. La versión vigente será la publicada
                    en esta página.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">
                    17. Ley aplicable y contacto
                  </h2>
                  <p className="mt-3">
                    Estos Términos se interpretan conforme a la normativa
                    aplicable en la República del Perú.
                  </p>
                  <p className="mt-3">
                    Para consultas relacionadas con el servicio o con estos
                    términos, puedes escribir a{" "}
                    <a
                      href="mailto:mokkopet@gmail.com"
                      className="text-[#E8C547] transition hover:text-[#f0cf55]"
                    >
                      mokkopet@gmail.com
                    </a>
                    .
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