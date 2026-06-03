import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import Card from "../ui/Card";
import Button from "../ui/Button";
import CustomSelect, {
  type CustomSelectOption,
} from "../ui/CustomSelect";
import { DateInput, FieldLabel, TextInput } from "../ui/Field";

type SpeciesType = "dog" | "cat";
type PetSexType = "male" | "female" | "unknown";

type BreedOption = {
  id: string;
  species: SpeciesType;
  name: string;
  name_es: string | null;
  slug: string | null;
  is_mixed: boolean;
  is_popular: boolean;
  sort_order: number;
};

type PetFormInitialValues = {
  id?: string;
  name?: string;
  species?: SpeciesType;
  breed_id?: string | null;
  breed_custom?: string | null;
  sex?: PetSexType | null;
  color?: string | null;
  birthdate?: string | null;
  weight_kg?: number | null;
  photo_url?: string | null;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: PetFormInitialValues;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const CUSTOM_BREED_VALUE = "__custom__";
const PET_PHOTOS_BUCKET = "pet-photos";
const MAX_PHOTO_SIZE_MB = 5;

export default function PetForm({
  mode,
  initialValues,
  onSuccess,
  onCancel,
}: Props) {
  const { user } = useAuth();

  const [loadingBreeds, setLoadingBreeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [breeds, setBreeds] = useState<BreedOption[]>([]);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [species, setSpecies] = useState<SpeciesType>(
    initialValues?.species ?? "dog"
  );
  const [breedId, setBreedId] = useState(initialValues?.breed_id ?? "");
  const [breedCustom, setBreedCustom] = useState(
    initialValues?.breed_custom ?? ""
  );
  const [sex, setSex] = useState<PetSexType>(initialValues?.sex ?? "unknown");
  const [color, setColor] = useState(initialValues?.color ?? "");
  const [birthdate, setBirthdate] = useState(initialValues?.birthdate ?? "");
  const [weightKg, setWeightKg] = useState(
    initialValues?.weight_kg != null ? String(initialValues.weight_kg) : ""
  );

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(
    initialValues?.photo_url ?? ""
  );

  const [useCustomBreed, setUseCustomBreed] = useState(
    Boolean(initialValues?.breed_custom) && !initialValues?.breed_id
  );

  const formBusy = loadingBreeds || submitting;

  const speciesLabel = useMemo(() => {
    return species === "dog" ? "perro" : "gato";
  }, [species]);

  const selectedPhotoName = useMemo(() => {
    if (photoFile) return photoFile.name;
    if (initialValues?.photo_url) return "Foto actual";
    return "Sin archivo seleccionado";
  }, [photoFile, initialValues?.photo_url]);

  const speciesOptions = useMemo<CustomSelectOption[]>(
    () => [
      { value: "dog", label: "Perro" },
      { value: "cat", label: "Gato" },
    ],
    []
  );

  const sexOptions = useMemo<CustomSelectOption[]>(
    () => [
      { value: "unknown", label: "No especificado" },
      { value: "male", label: "Macho" },
      { value: "female", label: "Hembra" },
    ],
    []
  );

  const breedOptions = useMemo<CustomSelectOption[]>(() => {
    const mapped = breeds.map((breed) => ({
      value: breed.id,
      label: breed.name_es || breed.name,
      description: breed.is_popular ? "Raza popular" : undefined,
    }));

    return [
      ...mapped,
      {
        value: CUSTOM_BREED_VALUE,
        label: "No encuentro la raza",
      },
    ];
  }, [breeds]);

  useEffect(() => {
    let isMounted = true;

    const loadBreeds = async () => {
      setLoadingBreeds(true);

      try {
        const { data, error } = await supabase
          .from("pet_breeds")
          .select(
            "id, species, name, name_es, slug, is_mixed, is_popular, sort_order"
          )
          .eq("species", species)
          .eq("is_active", true)
          .order("is_popular", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("name_es", { ascending: true, nullsFirst: false })
          .order("name", { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        setBreeds((data ?? []) as BreedOption[]);
      } catch (error: any) {
        console.error("PetForm loadBreeds error:", error);
        if (!isMounted) return;

        setBreeds([]);
        setErrorMsg(error?.message ?? "No se pudieron cargar las razas.");
      } finally {
        if (isMounted) setLoadingBreeds(false);
      }
    };

    void loadBreeds();

    return () => {
      isMounted = false;
    };
  }, [species]);

  useEffect(() => {
    setErrorMsg("");
    setSuccessMsg("");
  }, [species, breedId, breedCustom, name, sex, color, birthdate, weightKg]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleSpeciesChange = (value: string) => {
    const nextSpecies = value as SpeciesType;
    setSpecies(nextSpecies);
    setBreedId("");
    setBreedCustom("");
    setUseCustomBreed(false);
  };

  const handleBreedChange = (value: string) => {
    if (value === CUSTOM_BREED_VALUE) {
      setUseCustomBreed(true);
      setBreedId("");
      return;
    }

    setUseCustomBreed(false);
    setBreedId(value);
    setBreedCustom("");
  };

  const handlePhotoChange = (file: File | null) => {
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);

    if (!file) {
      setPhotoPreview(initialValues?.photo_url ?? "");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const clearSelectedPhoto = () => {
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(null);
    setPhotoPreview(initialValues?.photo_url ?? "");
  };

  const validateForm = () => {
    if (!user?.id) {
      setErrorMsg("No hay una sesión activa.");
      return false;
    }

    if (!name.trim()) {
      setErrorMsg("Ingresa el nombre de la mascota.");
      return false;
    }

    if (name.trim().length < 2) {
      setErrorMsg("El nombre debe tener al menos 2 caracteres.");
      return false;
    }

    if (useCustomBreed) {
      if (!breedCustom.trim()) {
        setErrorMsg(`Ingresa la raza de tu ${speciesLabel}.`);
        return false;
      }

      if (breedCustom.trim().length < 2) {
        setErrorMsg("La raza personalizada debe tener al menos 2 caracteres.");
        return false;
      }
    } else {
      if (!breedId) {
        setErrorMsg(`Selecciona una raza de ${speciesLabel}.`);
        return false;
      }
    }

    if (weightKg.trim()) {
      const parsed = Number(weightKg);
      if (Number.isNaN(parsed) || parsed < 0) {
        setErrorMsg("Ingresa un peso válido.");
        return false;
      }
    }

    if (photoFile) {
      const isImage = photoFile.type.startsWith("image/");
      if (!isImage) {
        setErrorMsg("La foto debe ser una imagen válida.");
        return false;
      }

      const maxBytes = MAX_PHOTO_SIZE_MB * 1024 * 1024;
      if (photoFile.size > maxBytes) {
        setErrorMsg(`La foto no debe superar ${MAX_PHOTO_SIZE_MB} MB.`);
        return false;
      }
    }

    return true;
  };

  const uploadPetPhoto = async () => {
    if (!photoFile || !user?.id) {
      return initialValues?.photo_url ?? null;
    }

    const rawExt = photoFile.name.split(".").pop()?.toLowerCase();
    const safeExt = rawExt && rawExt.length <= 5 ? rawExt : "jpg";
    const filePath = `${user.id}/${crypto.randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .upload(filePath, photoFile, {
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const uploadedPhotoUrl = await uploadPetPhoto();

      const payload = {
        name: name.trim(),
        species,
        breed_id: useCustomBreed ? null : breedId,
        breed_custom: useCustomBreed ? breedCustom.trim() : null,
        sex,
        color: color.trim() || null,
        birthdate: birthdate || null,
        weight_kg: weightKg.trim() ? Number(weightKg) : null,
        photo_url: uploadedPhotoUrl,
      };

      if (mode === "create") {
        const { error } = await supabase.from("pets").insert({
          owner_user_id: user!.id,
          ...payload,
        });

        if (error) throw error;
      } else {
        if (!initialValues?.id) {
          throw new Error("No se encontró el ID de la mascota.");
        }

        const { error } = await supabase
          .from("pets")
          .update(payload)
          .eq("id", initialValues.id)
          .eq("owner_user_id", user!.id);

        if (error) throw error;
      }

      setSuccessMsg(
        mode === "create"
          ? "Mascota registrada correctamente."
          : "Mascota actualizada correctamente."
      );

      onSuccess?.();
    } catch (error: any) {
      console.error("PetForm submit error:", error);
      setErrorMsg(error?.message ?? "No se pudo guardar la mascota.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
          {successMsg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={formBusy}
            placeholder="Max"
          />
        </div>

        <div>
          <FieldLabel>Especie</FieldLabel>
          <CustomSelect
            value={species}
            onChange={handleSpeciesChange}
            options={speciesOptions}
            placeholder="Selecciona una especie"
            disabled={formBusy}
          />
        </div>

        <div>
          <FieldLabel>Raza</FieldLabel>
          <CustomSelect
            value={useCustomBreed ? CUSTOM_BREED_VALUE : breedId}
            onChange={handleBreedChange}
            options={breedOptions}
            placeholder={
              loadingBreeds ? "Cargando razas..." : "Selecciona una raza"
            }
            disabled={formBusy || loadingBreeds}
            emptyText="No hay razas disponibles"
          />
        </div>

        <div>
          <FieldLabel>Sexo</FieldLabel>
          <CustomSelect
            value={sex}
            onChange={(value) => setSex(value as PetSexType)}
            options={sexOptions}
            placeholder="Selecciona el sexo"
            disabled={formBusy}
          />
        </div>

        {useCustomBreed && (
          <div className="md:col-span-2">
            <FieldLabel>Escribe la raza</FieldLabel>
            <TextInput
              type="text"
              value={breedCustom}
              onChange={(e) => setBreedCustom(e.target.value)}
              disabled={formBusy}
              placeholder={
                species === "dog"
                  ? "Ej. Goldendoodle, criollo, mestizo..."
                  : "Ej. Siamés, criollo, mestizo..."
              }
            />
          </div>
        )}

        <div>
          <FieldLabel>Color</FieldLabel>
          <TextInput
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={formBusy}
            placeholder="Marrón, blanco, negro..."
          />
        </div>

        <div>
          <FieldLabel>Fecha de nacimiento</FieldLabel>
          <DateInput
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            disabled={formBusy}
          />
        </div>

        <div>
          <FieldLabel>Peso (kg)</FieldLabel>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            disabled={formBusy}
            placeholder="12.5"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Foto de la mascota</FieldLabel>

          <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <Card
              variant="dark"
              className="rounded-[24px] border border-white/10 p-5 shadow-none"
            >
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  disabled={formBusy}
                  onChange={(e) =>
                    handlePhotoChange(e.target.files?.[0] ?? null)
                  }
                  className="w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-[#E8C547] file:px-4 file:py-2 file:font-medium file:text-[#1A1A14] hover:file:bg-[#f0cf55] focus:border-[#E8C547]/50"
                />

                <div className="flex flex-wrap items-center gap-2 text-sm text-white/72">
                  <span className="text-white/42">Archivo:</span>
                  <span className="truncate">{selectedPhotoName}</span>
                </div>

                <p className="text-xs leading-6 text-white/50">
                  JPG, PNG o WEBP. Máximo {MAX_PHOTO_SIZE_MB} MB.
                </p>

                {(photoFile || photoPreview) && (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearSelectedPhoto}
                      disabled={formBusy}
                    >
                      Restablecer foto
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card
              variant="dark"
              className="rounded-[24px] border border-dashed border-white/10 p-4 shadow-none backdrop-blur-none"
            >
              <div className="mb-3">
                <div className="text-sm font-medium text-white/88">
                  Vista previa
                </div>
                <div className="text-xs text-white/45">
                  La imagen se ajusta sin recortarse.
                </div>
              </div>

              <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#0f0f0b]">
                {photoPreview ? (
                  <div className="flex h-[200px] items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 md:h-[240px]">
                    <img
                      src={photoPreview}
                      alt="Vista previa de la mascota"
                      className="max-h-full max-w-full rounded-2xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center px-6 text-center text-sm text-white/50 md:h-[240px]">
                    Aún no hay foto seleccionada.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={formBusy}
          >
            Cancelar
          </Button>
        )}

        <Button type="submit" variant="primary" disabled={formBusy}>
          {submitting
            ? "Guardando..."
            : mode === "create"
            ? "Guardar mascota"
            : "Actualizar mascota"}
        </Button>
      </div>
    </form>
  );
}