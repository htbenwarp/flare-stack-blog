import { useState } from "react";
import { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Check } from "lucide-react";

interface AvatarPickerProps {
  value: string;
  onChange: (url: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { mediaItems } = useMediaPicker();

  const handleSelect = (media: MediaAsset) => {
    onChange(media.url);
    setShowPicker(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        {value ? (
          <img
            src={value}
            alt="Avatar preview"
            className="h-10 w-10 rounded-full object-cover border"
          />
        ) : (
          <div className="h-10 w-10 rounded-full border flex items-center justify-center bg-muted">
            <ImageIcon size={18} className="text-muted-foreground" />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
        >
          选择资产
        </Button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="或手动输入 URL"
          className="flex-1 h-9 bg-transparent border-b border-border/50 rounded-none focus:border-foreground focus:ring-0 px-2 text-xs"
        />
      </div>
      {showPicker && (
        <div className="mt-2 border border-border/30 bg-background p-4 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2">
            {mediaItems.map((media) => (
              <div
                key={media.key}
                onClick={() => handleSelect(media)}
                className="relative aspect-square cursor-pointer border hover:border-primary transition-colors"
              >
                <img
                  src={getOptimizedImageUrl(media.key)}
                  alt={media.fileName}
                  className="w-full h-full object-cover"
                />
                {value === media.url && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <Check className="text-primary" size={20} />
                  </div>
                )}
              </div>
            ))}
            {mediaItems.length === 0 && (
              <p className="col-span-4 text-center text-xs text-muted-foreground">
                暂无图片，请先在媒体库上传
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}